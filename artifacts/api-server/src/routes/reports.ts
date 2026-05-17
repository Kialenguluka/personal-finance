import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, transactionsTable, categoriesTable, accountsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/reports/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { date_from, date_to } = req.query;
  if (!date_from || !date_to) {
    res.status(400).json({ error: "date_from and date_to are required" });
    return;
  }

  const rows = await db
    .select({
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.userId, req.userId!),
        gte(transactionsTable.date, date_from as string),
        lte(transactionsTable.date, date_to as string)
      )
    );

  const totalIncome = rows.filter(r => r.type === "income").reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalExpense = rows.filter(r => r.type === "expense").reduce((s, r) => s + parseFloat(r.amount), 0);

  const catMap = new Map<number, { categoryId: number; categoryName: string; categoryColor: string | null; categoryIcon: string | null; total: number }>();
  for (const row of rows.filter(r => r.type === "expense")) {
    const existing = catMap.get(row.categoryId);
    if (existing) {
      existing.total += parseFloat(row.amount);
    } else {
      catMap.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "Unknown",
        categoryColor: row.categoryColor ?? null,
        categoryIcon: row.categoryIcon ?? null,
        total: parseFloat(row.amount),
      });
    }
  }

  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
    transactionCount: rows.length,
    dateFrom: date_from,
    dateTo: date_to,
    byCategory: Array.from(catMap.values()).sort((a, b) => b.total - a.total),
  });
});

router.get("/reports/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { date_from, date_to } = req.query;
  if (!date_from || !date_to) {
    res.status(400).json({ error: "date_from and date_to are required" });
    return;
  }

  const rows = await db
    .select({
      id: transactionsTable.id,
      userId: transactionsTable.userId,
      accountId: transactionsTable.accountId,
      categoryId: transactionsTable.categoryId,
      type: transactionsTable.type,
      amount: transactionsTable.amount,
      description: transactionsTable.description,
      date: transactionsTable.date,
      notes: transactionsTable.notes,
      createdAt: transactionsTable.createdAt,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
      accountName: accountsTable.name,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .leftJoin(accountsTable, eq(transactionsTable.accountId, accountsTable.id))
    .where(
      and(
        eq(transactionsTable.userId, req.userId!),
        gte(transactionsTable.date, date_from as string),
        lte(transactionsTable.date, date_to as string)
      )
    );

  rows.sort((a, b) => (a.date < b.date ? 1 : -1));

  res.json(rows.map(t => ({
    id: t.id,
    userId: t.userId,
    accountId: t.accountId,
    categoryId: t.categoryId,
    type: t.type,
    amount: parseFloat(t.amount),
    description: t.description ?? null,
    date: t.date,
    notes: t.notes ?? null,
    createdAt: t.createdAt,
    categoryName: t.categoryName ?? null,
    categoryColor: t.categoryColor ?? null,
    categoryIcon: t.categoryIcon ?? null,
    accountName: t.accountName ?? null,
  })));
});

export default router;

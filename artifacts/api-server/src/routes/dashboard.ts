import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, transactionsTable, accountsTable, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/dashboard/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const m = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
  const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();

  const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, req.userId!));
  const totalBalance = accounts.reduce((s, a) => s + parseFloat(a.balance), 0);

  const monthTxns = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.userId, req.userId!),
      gte(transactionsTable.date, dateFrom),
      lte(transactionsTable.date, dateTo)
    )
  );

  const monthlyIncome = monthTxns.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
  const monthlyExpense = monthTxns.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);

  res.json({
    totalBalance,
    monthlyIncome,
    monthlyExpense,
    monthlyBalance: monthlyIncome - monthlyExpense,
    month: m,
    year: y,
  });
});

router.get("/dashboard/by-category", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const m = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
  const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();

  const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

  const rows = await db
    .select({
      categoryId: transactionsTable.categoryId,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
      amount: transactionsTable.amount,
    })
    .from(transactionsTable)
    .leftJoin(categoriesTable, eq(transactionsTable.categoryId, categoriesTable.id))
    .where(
      and(
        eq(transactionsTable.userId, req.userId!),
        eq(transactionsTable.type, "expense"),
        gte(transactionsTable.date, dateFrom),
        lte(transactionsTable.date, dateTo)
      )
    );

  const grouped = new Map<number, { categoryId: number; categoryName: string; categoryColor: string | null; categoryIcon: string | null; total: number }>();
  for (const row of rows) {
    const existing = grouped.get(row.categoryId);
    if (existing) {
      existing.total += parseFloat(row.amount);
    } else {
      grouped.set(row.categoryId, {
        categoryId: row.categoryId,
        categoryName: row.categoryName ?? "Unknown",
        categoryColor: row.categoryColor ?? null,
        categoryIcon: row.categoryIcon ?? null,
        total: parseFloat(row.amount),
      });
    }
  }

  res.json(Array.from(grouped.values()).sort((a, b) => b.total - a.total));
});

router.get("/dashboard/cashflow", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const months: Array<{ month: number; year: number; label: string; income: number; expense: number }> = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
    const lastDay = new Date(y, m, 0).getDate();
    const dateTo = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

    const txns = await db.select().from(transactionsTable).where(
      and(
        eq(transactionsTable.userId, req.userId!),
        gte(transactionsTable.date, dateFrom),
        lte(transactionsTable.date, dateTo)
      )
    );

    const income = txns.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
    const expense = txns.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);
    const MONTH_LABELS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    months.push({ month: m, year: y, label: `${MONTH_LABELS[m - 1]}/${y}`, income, expense });
  }

  res.json(months);
});

router.get("/dashboard/recent-transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
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
    .where(eq(transactionsTable.userId, req.userId!));

  rows.sort((a, b) => (a.date < b.date ? 1 : -1));
  const recent = rows.slice(0, 5);

  res.json(recent.map(t => ({
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

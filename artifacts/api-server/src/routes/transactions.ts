import { Router, type IRouter } from "express";
import { eq, and, gte, lte, ilike, sql } from "drizzle-orm";
import { db, transactionsTable, accountsTable, categoriesTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatTransaction(t: typeof transactionsTable.$inferSelect & {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  accountName?: string | null;
}) {
  return {
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
  };
}

router.get("/transactions/summary", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { month, year } = req.query;
  const now = new Date();
  const m = month ? parseInt(month as string, 10) : now.getMonth() + 1;
  const y = year ? parseInt(year as string, 10) : now.getFullYear();

  const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

  const rows = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.userId, req.userId!),
      gte(transactionsTable.date, dateFrom),
      lte(transactionsTable.date, dateTo)
    )
  );

  const totalIncome = rows.filter(r => r.type === "income").reduce((s, r) => s + parseFloat(r.amount), 0);
  const totalExpense = rows.filter(r => r.type === "expense").reduce((s, r) => s + parseFloat(r.amount), 0);

  res.json({
    totalIncome,
    totalExpense,
    balance: totalIncome - totalExpense,
  });
});

router.get("/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { type, category_id, account_id, date_from, date_to, search } = req.query;
  const page = parseInt((req.query.page as string) ?? "1", 10);
  const limit = parseInt((req.query.limit as string) ?? "20", 10);
  const offset = (page - 1) * limit;

  const allRows = await db
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

  let filtered = allRows;
  if (type) filtered = filtered.filter(r => r.type === type);
  if (category_id) filtered = filtered.filter(r => r.categoryId === parseInt(category_id as string, 10));
  if (account_id) filtered = filtered.filter(r => r.accountId === parseInt(account_id as string, 10));
  if (date_from) filtered = filtered.filter(r => r.date >= (date_from as string));
  if (date_to) filtered = filtered.filter(r => r.date <= (date_to as string));
  if (search) {
    const s = (search as string).toLowerCase();
    filtered = filtered.filter(r =>
      r.description?.toLowerCase().includes(s) ||
      r.categoryName?.toLowerCase().includes(s) ||
      r.accountName?.toLowerCase().includes(s)
    );
  }

  // Sort by date descending
  filtered.sort((a, b) => (a.date < b.date ? 1 : -1));

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + limit);

  res.json({
    data: paginated.map(formatTransaction),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
});

router.post("/transactions", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { accountId, categoryId, type, amount, description, date, notes } = req.body;
  if (!accountId || !categoryId || !type || !amount || !date) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [transaction] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    accountId,
    categoryId,
    type,
    amount: amount.toString(),
    description: description ?? null,
    date,
    notes: notes ?? null,
  }).returning();

  // Update account balance
  const delta = type === "income" ? parseFloat(amount) : -parseFloat(amount);
  await db.execute(
    sql`UPDATE accounts SET balance = balance + ${delta} WHERE id = ${accountId} AND user_id = ${req.userId!}`
  );

  const [withJoins] = await db
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
    .where(eq(transactionsTable.id, transaction.id));

  res.status(201).json(formatTransaction(withJoins));
});

router.get("/transactions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [row] = await db
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
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.userId!)));

  if (!row) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(formatTransaction(row));
});

router.put("/transactions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  // Get original transaction to revert balance
  const [original] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.userId!))
  );
  if (!original) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Revert original balance effect
  const originalDelta = original.type === "income" ? -parseFloat(original.amount) : parseFloat(original.amount);
  await db.execute(
    sql`UPDATE accounts SET balance = balance + ${originalDelta} WHERE id = ${original.accountId} AND user_id = ${req.userId!}`
  );

  const { accountId, categoryId, type, amount, description, date, notes } = req.body;
  const updates: Partial<typeof transactionsTable.$inferInsert> = {};
  if (accountId !== undefined) updates.accountId = accountId;
  if (categoryId !== undefined) updates.categoryId = categoryId;
  if (type !== undefined) updates.type = type;
  if (amount !== undefined) updates.amount = amount.toString();
  if (description !== undefined) updates.description = description;
  if (date !== undefined) updates.date = date;
  if (notes !== undefined) updates.notes = notes;

  const [updated] = await db.update(transactionsTable)
    .set(updates)
    .where(and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.userId!)))
    .returning();

  // Apply new balance effect
  const newAccountId = accountId ?? original.accountId;
  const newType = type ?? original.type;
  const newAmount = amount ?? parseFloat(original.amount);
  const newDelta = newType === "income" ? parseFloat(newAmount) : -parseFloat(newAmount);
  await db.execute(
    sql`UPDATE accounts SET balance = balance + ${newDelta} WHERE id = ${newAccountId} AND user_id = ${req.userId!}`
  );

  const [withJoins] = await db
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
    .where(eq(transactionsTable.id, updated.id));

  res.json(formatTransaction(withJoins));
});

router.delete("/transactions/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);

  const [original] = await db.select().from(transactionsTable).where(
    and(eq(transactionsTable.id, id), eq(transactionsTable.userId, req.userId!))
  );
  if (!original) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }

  // Revert balance
  const delta = original.type === "income" ? -parseFloat(original.amount) : parseFloat(original.amount);
  await db.execute(
    sql`UPDATE accounts SET balance = balance + ${delta} WHERE id = ${original.accountId} AND user_id = ${req.userId!}`
  );

  await db.delete(transactionsTable).where(eq(transactionsTable.id, id));
  res.json({ message: "Transaction deleted" });
});

export default router;

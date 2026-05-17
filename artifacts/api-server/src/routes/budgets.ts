import { Router, type IRouter } from "express";
import { eq, and, gte, lte } from "drizzle-orm";
import { db, budgetsTable, categoriesTable, transactionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatBudget(b: typeof budgetsTable.$inferSelect & {
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
}) {
  return {
    id: b.id,
    userId: b.userId,
    categoryId: b.categoryId,
    month: b.month,
    year: b.year,
    amount: parseFloat(b.amount),
    categoryName: b.categoryName ?? null,
    categoryColor: b.categoryColor ?? null,
    categoryIcon: b.categoryIcon ?? null,
  };
}

router.get("/budgets/status", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const m = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
  const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();

  const dateFrom = `${y}-${String(m).padStart(2, "0")}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const dateTo = `${y}-${String(m).padStart(2, "0")}-${lastDay}`;

  const budgets = await db
    .select({
      id: budgetsTable.id,
      userId: budgetsTable.userId,
      categoryId: budgetsTable.categoryId,
      month: budgetsTable.month,
      year: budgetsTable.year,
      amount: budgetsTable.amount,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(budgetsTable.userId, req.userId!),
      eq(budgetsTable.month, m),
      eq(budgetsTable.year, y)
    ));

  const transactions = await db.select().from(transactionsTable).where(
    and(
      eq(transactionsTable.userId, req.userId!),
      eq(transactionsTable.type, "expense"),
      gte(transactionsTable.date, dateFrom),
      lte(transactionsTable.date, dateTo)
    )
  );

  const status = budgets.map(b => {
    const spent = transactions
      .filter(t => t.categoryId === b.categoryId)
      .reduce((s, t) => s + parseFloat(t.amount), 0);
    const budgeted = parseFloat(b.amount);
    const percentage = budgeted > 0 ? (spent / budgeted) * 100 : 0;
    return {
      categoryId: b.categoryId,
      categoryName: b.categoryName ?? "Unknown",
      categoryColor: b.categoryColor ?? null,
      categoryIcon: b.categoryIcon ?? null,
      budgeted,
      spent,
      percentage: Math.round(percentage * 100) / 100,
    };
  });

  res.json(status);
});

router.get("/budgets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const now = new Date();
  const m = req.query.month ? parseInt(req.query.month as string, 10) : now.getMonth() + 1;
  const y = req.query.year ? parseInt(req.query.year as string, 10) : now.getFullYear();

  const budgets = await db
    .select({
      id: budgetsTable.id,
      userId: budgetsTable.userId,
      categoryId: budgetsTable.categoryId,
      month: budgetsTable.month,
      year: budgetsTable.year,
      amount: budgetsTable.amount,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(and(
      eq(budgetsTable.userId, req.userId!),
      eq(budgetsTable.month, m),
      eq(budgetsTable.year, y)
    ));

  res.json(budgets.map(formatBudget));
});

router.post("/budgets", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { categoryId, month, year, amount } = req.body;
  if (!categoryId || !month || !year || !amount) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [budget] = await db.insert(budgetsTable).values({
    userId: req.userId!,
    categoryId,
    month,
    year,
    amount: amount.toString(),
  }).returning();

  const [withCat] = await db
    .select({
      id: budgetsTable.id,
      userId: budgetsTable.userId,
      categoryId: budgetsTable.categoryId,
      month: budgetsTable.month,
      year: budgetsTable.year,
      amount: budgetsTable.amount,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(eq(budgetsTable.id, budget.id));

  res.status(201).json(formatBudget(withCat));
});

router.put("/budgets/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { amount } = req.body;
  const [budget] = await db.update(budgetsTable)
    .set({ amount: amount.toString() })
    .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.userId!)))
    .returning();
  if (!budget) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  const [withCat] = await db
    .select({
      id: budgetsTable.id,
      userId: budgetsTable.userId,
      categoryId: budgetsTable.categoryId,
      month: budgetsTable.month,
      year: budgetsTable.year,
      amount: budgetsTable.amount,
      categoryName: categoriesTable.name,
      categoryColor: categoriesTable.color,
      categoryIcon: categoriesTable.icon,
    })
    .from(budgetsTable)
    .leftJoin(categoriesTable, eq(budgetsTable.categoryId, categoriesTable.id))
    .where(eq(budgetsTable.id, budget.id));
  res.json(formatBudget(withCat));
});

router.delete("/budgets/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [budget] = await db.delete(budgetsTable)
    .where(and(eq(budgetsTable.id, id), eq(budgetsTable.userId, req.userId!)))
    .returning();
  if (!budget) {
    res.status(404).json({ error: "Budget not found" });
    return;
  }
  res.json({ message: "Budget deleted" });
});

export default router;

import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, transactionsTable, accountsTable } from "@workspace/db";
import { requireAdmin, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatUser(u: typeof usersTable.$inferSelect) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role,
    preferredLang: u.preferredLang,
    currency: u.currency,
    createdAt: u.createdAt,
  };
}

router.get("/admin/users", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  res.json(users.map(formatUser));
});

router.put("/admin/users/:id", requireAdmin, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { role } = req.body;
  if (!role || !["user", "admin"].includes(role)) {
    res.status(400).json({ error: "Invalid role" });
    return;
  }
  const [user] = await db.update(usersTable)
    .set({ role })
    .where(eq(usersTable.id, id))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(formatUser(user));
});

router.get("/admin/stats", requireAdmin, async (_req, res): Promise<void> => {
  const users = await db.select().from(usersTable);
  const transactions = await db.select().from(transactionsTable);
  const accounts = await db.select().from(accountsTable);

  const totalIncome = transactions.filter(t => t.type === "income").reduce((s, t) => s + parseFloat(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === "expense").reduce((s, t) => s + parseFloat(t.amount), 0);

  res.json({
    totalUsers: users.length,
    totalTransactions: transactions.length,
    totalAccounts: accounts.length,
    totalIncome,
    totalExpense,
  });
});

export default router;

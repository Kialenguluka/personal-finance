import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, accountsTable, transactionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatAccount(a: typeof accountsTable.$inferSelect) {
  return {
    id: a.id,
    userId: a.userId,
    name: a.name,
    type: a.type,
    balance: parseFloat(a.balance),
    currency: a.currency,
    color: a.color,
    isActive: a.isActive,
    createdAt: a.createdAt,
  };
}

router.get("/accounts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const accounts = await db.select().from(accountsTable).where(eq(accountsTable.userId, req.userId!));
  res.json(accounts.map(formatAccount));
});

router.post("/accounts", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, type, balance, currency, color } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [account] = await db.insert(accountsTable).values({
    userId: req.userId!,
    name,
    type,
    balance: balance?.toString() ?? "0.00",
    currency: currency ?? "AOA",
    color: color ?? "#2E7D32",
  }).returning();
  res.status(201).json(formatAccount(account));
});

router.get("/accounts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [account] = await db.select().from(accountsTable).where(
    and(eq(accountsTable.id, id), eq(accountsTable.userId, req.userId!))
  );
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(formatAccount(account));
});

router.put("/accounts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, type, balance, currency, color, isActive } = req.body;
  const updates: Partial<typeof accountsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (balance !== undefined) updates.balance = balance.toString();
  if (currency !== undefined) updates.currency = currency;
  if (color !== undefined) updates.color = color;
  if (isActive !== undefined) updates.isActive = isActive;

  const [account] = await db.update(accountsTable)
    .set(updates)
    .where(and(eq(accountsTable.id, id), eq(accountsTable.userId, req.userId!)))
    .returning();
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json(formatAccount(account));
});

router.delete("/accounts/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.accountId, id));
  if (txns.length > 0) {
    res.status(400).json({ error: "Cannot delete account with transactions" });
    return;
  }
  const [account] = await db.delete(accountsTable)
    .where(and(eq(accountsTable.id, id), eq(accountsTable.userId, req.userId!)))
    .returning();
  if (!account) {
    res.status(404).json({ error: "Account not found" });
    return;
  }
  res.json({ message: "Account deleted" });
});

export default router;

import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, goalsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatGoal(g: typeof goalsTable.$inferSelect) {
  const current = parseFloat(g.currentAmount);
  const target = parseFloat(g.targetAmount);
  const progressPercentage = target > 0 ? Math.min((current / target) * 100, 100) : 0;
  return {
    id: g.id,
    userId: g.userId,
    name: g.name,
    description: g.description ?? null,
    targetAmount: target,
    currentAmount: current,
    deadline: g.deadline ?? null,
    icon: g.icon,
    color: g.color,
    status: g.status,
    progressPercentage: Math.round(progressPercentage * 100) / 100,
    createdAt: g.createdAt,
  };
}

router.get("/goals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const goals = await db.select().from(goalsTable).where(eq(goalsTable.userId, req.userId!));
  res.json(goals.map(formatGoal));
});

router.post("/goals", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, description, targetAmount, currentAmount, deadline, icon, color } = req.body;
  if (!name || !targetAmount) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [goal] = await db.insert(goalsTable).values({
    userId: req.userId!,
    name,
    description: description ?? null,
    targetAmount: targetAmount.toString(),
    currentAmount: currentAmount ? currentAmount.toString() : "0.00",
    deadline: deadline ?? null,
    icon: icon ?? "flag",
    color: color ?? "#E65100",
  }).returning();
  res.status(201).json(formatGoal(goal));
});

router.get("/goals/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [goal] = await db.select().from(goalsTable).where(
    and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!))
  );
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(formatGoal(goal));
});

router.put("/goals/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, description, targetAmount, deadline, icon, color, status } = req.body;
  const updates: Partial<typeof goalsTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (targetAmount !== undefined) updates.targetAmount = targetAmount.toString();
  if (deadline !== undefined) updates.deadline = deadline;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (status !== undefined) updates.status = status;

  const [goal] = await db.update(goalsTable)
    .set(updates)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json(formatGoal(goal));
});

router.delete("/goals/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const [goal] = await db.delete(goalsTable)
    .where(and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!)))
    .returning();
  if (!goal) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }
  res.json({ message: "Goal deleted" });
});

router.post("/goals/:id/deposit", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    res.status(400).json({ error: "Invalid amount" });
    return;
  }

  const [existing] = await db.select().from(goalsTable).where(
    and(eq(goalsTable.id, id), eq(goalsTable.userId, req.userId!))
  );
  if (!existing) {
    res.status(404).json({ error: "Goal not found" });
    return;
  }

  const newAmount = parseFloat(existing.currentAmount) + parseFloat(amount);
  const newStatus = newAmount >= parseFloat(existing.targetAmount) ? "completed" : existing.status;

  const [goal] = await db.update(goalsTable)
    .set({
      currentAmount: newAmount.toString(),
      status: newStatus,
    })
    .where(eq(goalsTable.id, id))
    .returning();

  res.json(formatGoal(goal));
});

export default router;

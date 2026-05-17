import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, categoriesTable, transactionsTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function formatCategory(c: typeof categoriesTable.$inferSelect) {
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    type: c.type,
    icon: c.icon,
    color: c.color,
    isActive: c.isActive,
  };
}

router.get("/categories", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { type } = req.query;
  let query = db.select().from(categoriesTable).where(eq(categoriesTable.userId, req.userId!));
  const rows = await query;
  const filtered = type ? rows.filter(c => c.type === type) : rows;
  res.json(filtered.map(formatCategory));
});

router.post("/categories", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, type, icon, color } = req.body;
  if (!name || !type) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({
    userId: req.userId!,
    name,
    type,
    icon: icon ?? "circle-dot",
    color: color ?? "#1565C0",
  }).returning();
  res.status(201).json(formatCategory(cat));
});

router.put("/categories/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const { name, type, icon, color, isActive } = req.body;
  const updates: Partial<typeof categoriesTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (type !== undefined) updates.type = type;
  if (icon !== undefined) updates.icon = icon;
  if (color !== undefined) updates.color = color;
  if (isActive !== undefined) updates.isActive = isActive;

  const [cat] = await db.update(categoriesTable)
    .set(updates)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, req.userId!)))
    .returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json(formatCategory(cat));
});

router.delete("/categories/:id", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const id = parseInt(Array.isArray(req.params.id) ? req.params.id[0] : req.params.id, 10);
  const txns = await db.select().from(transactionsTable).where(eq(transactionsTable.categoryId, id));
  if (txns.length > 0) {
    res.status(400).json({ error: "Cannot delete category with transactions" });
    return;
  }
  const [cat] = await db.delete(categoriesTable)
    .where(and(eq(categoriesTable.id, id), eq(categoriesTable.userId, req.userId!)))
    .returning();
  if (!cat) {
    res.status(404).json({ error: "Category not found" });
    return;
  }
  res.json({ message: "Category deleted" });
});

export default router;

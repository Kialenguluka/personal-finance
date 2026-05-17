import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { createHash } from "crypto";
import { db, usersTable } from "@workspace/db";
import { requireAuth, type AuthRequest } from "../middlewares/auth";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "salt_financa").digest("hex");
}

router.get("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferredLang: user.preferredLang,
    currency: user.currency,
    createdAt: user.createdAt,
  });
});

router.put("/profile", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { name, preferredLang, currency } = req.body;
  const updates: Partial<typeof usersTable.$inferInsert> = {};
  if (name !== undefined) updates.name = name;
  if (preferredLang !== undefined) updates.preferredLang = preferredLang;
  if (currency !== undefined) updates.currency = currency;

  const [user] = await db.update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.userId!))
    .returning();
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    preferredLang: user.preferredLang,
    currency: user.currency,
    createdAt: user.createdAt,
  });
});

router.post("/profile/change-password", requireAuth, async (req: AuthRequest, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (newPassword.length < 6) {
    res.status(400).json({ error: "New password must be at least 6 characters" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user || user.passwordHash !== hashPassword(currentPassword)) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  await db.update(usersTable)
    .set({ passwordHash: hashPassword(newPassword) })
    .where(eq(usersTable.id, req.userId!));

  res.json({ message: "Password changed successfully" });
});

export default router;

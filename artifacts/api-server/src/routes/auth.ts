import { Router, type IRouter } from "express";
import { createHash } from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, categoriesTable } from "@workspace/db";
import { signJwt, requireAuth, type AuthRequest } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

function hashPassword(password: string): string {
  return createHash("sha256").update(password + "salt_financa").digest("hex");
}

const DEFAULT_INCOME_CATEGORIES = [
  { name: "Salário", icon: "briefcase", color: "#2E7D32" },
  { name: "Negócio", icon: "store", color: "#1565C0" },
  { name: "Freelance", icon: "laptop", color: "#6A1B9A" },
  { name: "Investimento", icon: "trending-up", color: "#00838F" },
  { name: "Outros", icon: "plus-circle", color: "#546E7A" },
];

const DEFAULT_EXPENSE_CATEGORIES = [
  { name: "Alimentação", icon: "utensils", color: "#E53935" },
  { name: "Habitação", icon: "home", color: "#F57C00" },
  { name: "Transporte", icon: "car", color: "#7B1FA2" },
  { name: "Saúde", icon: "heart-pulse", color: "#D81B60" },
  { name: "Educação", icon: "graduation-cap", color: "#1976D2" },
  { name: "Lazer", icon: "music", color: "#00897B" },
  { name: "Vestuário", icon: "shirt", color: "#5D4037" },
  { name: "Outros", icon: "circle-dot", color: "#78909C" },
];

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }
  if (password.length < 6) {
    res.status(400).json({ error: "Password must be at least 6 characters" });
    return;
  }

  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(400).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db.insert(usersTable).values({
    name,
    email,
    passwordHash: hashPassword(password),
  }).returning();

  // Create default categories
  const incomeCategories = DEFAULT_INCOME_CATEGORIES.map(c => ({ ...c, userId: user.id, type: "income" as const }));
  const expenseCategories = DEFAULT_EXPENSE_CATEGORIES.map(c => ({ ...c, userId: user.id, type: "expense" as const }));
  await db.insert(categoriesTable).values([...incomeCategories, ...expenseCategories]);

  const token = signJwt({ userId: user.id, role: user.role });
  req.log.info({ userId: user.id }, "User registered");
  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLang: user.preferredLang,
      currency: user.currency,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user || user.passwordHash !== hashPassword(password)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }

  const token = signJwt({ userId: user.id, role: user.role });
  req.log.info({ userId: user.id }, "User logged in");
  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      preferredLang: user.preferredLang,
      currency: user.currency,
      createdAt: user.createdAt,
    },
  });
});

router.post("/auth/logout", requireAuth, async (_req, res): Promise<void> => {
  res.json({ message: "Logged out" });
});

router.get("/auth/me", requireAuth, async (req: AuthRequest, res): Promise<void> => {
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

export default router;

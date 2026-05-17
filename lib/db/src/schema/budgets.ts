import { pgTable, serial, integer, decimal, smallint, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { categoriesTable } from "./categories";

export const budgetsTable = pgTable("budgets", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categoriesTable.id, { onDelete: "cascade" }),
  month: smallint("month").notNull(),
  year: smallint("year").notNull(),
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
}, (table) => [
  unique("uq_budget").on(table.userId, table.categoryId, table.month, table.year),
]);

export const insertBudgetSchema = createInsertSchema(budgetsTable).omit({ id: true });
export type InsertBudget = z.infer<typeof insertBudgetSchema>;
export type Budget = typeof budgetsTable.$inferSelect;

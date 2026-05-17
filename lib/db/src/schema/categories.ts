import { pgTable, serial, integer, varchar, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const categoryTypeEnum = pgEnum("category_type", ["income", "expense"]);

export const categoriesTable = pgTable("categories", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 100 }).notNull(),
  type: categoryTypeEnum("type").notNull(),
  icon: varchar("icon", { length: 50 }).notNull().default("attach_money"),
  color: varchar("color", { length: 7 }).notNull().default("#1565C0"),
  isActive: boolean("is_active").notNull().default(true),
});

export const insertCategorySchema = createInsertSchema(categoriesTable).omit({ id: true });
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type Category = typeof categoriesTable.$inferSelect;

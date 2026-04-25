import "server-only";

import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type IncomeRow = typeof schema.incomes.$inferSelect;

export async function listIncomes(): Promise<IncomeRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.incomes)
    .where(eq(schema.incomes.userId, user.id))
    .orderBy(desc(schema.incomes.date), desc(schema.incomes.createdAt));
}

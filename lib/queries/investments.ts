import "server-only";

import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type LiquidSavingsRow = typeof schema.liquidSavings.$inferSelect;
export type FixedIncomeRow = typeof schema.fixedIncome.$inferSelect;

export async function listLiquidSavings(): Promise<LiquidSavingsRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.liquidSavings)
    .where(eq(schema.liquidSavings.userId, user.id))
    .orderBy(desc(schema.liquidSavings.isActive), desc(schema.liquidSavings.applicationDate));
}

export async function listFixedIncome(): Promise<FixedIncomeRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.fixedIncome)
    .where(eq(schema.fixedIncome.userId, user.id))
    .orderBy(desc(schema.fixedIncome.isActive), desc(schema.fixedIncome.applicationDate));
}

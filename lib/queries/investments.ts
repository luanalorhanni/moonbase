import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type LiquidSavingsRow = typeof schema.liquidSavings.$inferSelect;
export type FixedIncomeRow = typeof schema.fixedIncome.$inferSelect;

export const listLiquidSavings = cachedQuery(
  "listLiquidSavings",
  [TAGS.liquidSavings],
  (userId): Promise<LiquidSavingsRow[]> =>
    db
      .select()
      .from(schema.liquidSavings)
      .where(eq(schema.liquidSavings.userId, userId))
      .orderBy(desc(schema.liquidSavings.isActive), desc(schema.liquidSavings.applicationDate)),
);

export const listFixedIncome = cachedQuery(
  "listFixedIncome",
  [TAGS.fixedIncome],
  (userId): Promise<FixedIncomeRow[]> =>
    db
      .select()
      .from(schema.fixedIncome)
      .where(eq(schema.fixedIncome.userId, userId))
      .orderBy(desc(schema.fixedIncome.isActive), desc(schema.fixedIncome.applicationDate)),
);

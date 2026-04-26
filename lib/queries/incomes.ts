import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type IncomeRow = typeof schema.incomes.$inferSelect;

export const listIncomes = cachedQuery(
  "listIncomes",
  [TAGS.incomes],
  (userId): Promise<IncomeRow[]> =>
    db
      .select()
      .from(schema.incomes)
      .where(eq(schema.incomes.userId, userId))
      .orderBy(desc(schema.incomes.date), desc(schema.incomes.createdAt)),
);

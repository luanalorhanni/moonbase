import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type InvestmentUpdateRow = typeof schema.investmentUpdates.$inferSelect;
export type InvestmentKind = "liquid_savings" | "fixed_income";

/**
 * All updates for the current user, both kinds, newest first. The page
 * filters in memory by (kind, investmentId) — that's cheap given how
 * few updates there are per investment, and a single cached query
 * means switching between investments inside the dialog is instant.
 */
export const listInvestmentUpdates = cachedQuery(
  "listInvestmentUpdates",
  [TAGS.investmentUpdates],
  (userId): Promise<InvestmentUpdateRow[]> =>
    db
      .select()
      .from(schema.investmentUpdates)
      .where(eq(schema.investmentUpdates.userId, userId))
      .orderBy(desc(schema.investmentUpdates.recordedOn), desc(schema.investmentUpdates.createdAt)),
);

export async function listUpdatesFor(
  kind: InvestmentKind,
  investmentId: string,
): Promise<InvestmentUpdateRow[]> {
  const all = await listInvestmentUpdates();
  return all.filter((u) => u.investmentKind === kind && u.investmentId === investmentId);
}

/**
 * Uncached single-row read used inside the upsert action — the cached
 * `listInvestmentUpdates` would otherwise serve a stale value during
 * the same write transaction.
 */
export async function getUpdateOnDate(
  userId: string,
  kind: InvestmentKind,
  investmentId: string,
  recordedOn: string,
): Promise<InvestmentUpdateRow | null> {
  const rows = await db
    .select()
    .from(schema.investmentUpdates)
    .where(
      and(
        eq(schema.investmentUpdates.userId, userId),
        eq(schema.investmentUpdates.investmentKind, kind),
        eq(schema.investmentUpdates.investmentId, investmentId),
        eq(schema.investmentUpdates.recordedOn, recordedOn),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

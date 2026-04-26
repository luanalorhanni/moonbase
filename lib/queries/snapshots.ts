import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type SnapshotRow = typeof schema.monthlySnapshots.$inferSelect;

export const listSnapshots = cachedQuery(
  "listSnapshots",
  [TAGS.snapshots],
  (userId): Promise<SnapshotRow[]> =>
    db
      .select()
      .from(schema.monthlySnapshots)
      .where(eq(schema.monthlySnapshots.userId, userId))
      .orderBy(desc(schema.monthlySnapshots.referenceMonth)),
);

/**
 * Single-row reads from snapshot actions are intentionally uncached: they run
 * inside `upsertMonthlySnapshot` immediately before a write, where stale data
 * would corrupt the cumulative `total_save` calculation.
 */
export async function getSnapshot(referenceMonth: string): Promise<SnapshotRow | null> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(
      and(
        eq(schema.monthlySnapshots.userId, user.id),
        eq(schema.monthlySnapshots.referenceMonth, referenceMonth),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export async function getPreviousSnapshot(referenceMonth: string): Promise<SnapshotRow | null> {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(schema.monthlySnapshots)
    .where(
      and(
        eq(schema.monthlySnapshots.userId, user.id),
        lt(schema.monthlySnapshots.referenceMonth, referenceMonth),
      ),
    )
    .orderBy(desc(schema.monthlySnapshots.referenceMonth))
    .limit(1);
  return rows[0] ?? null;
}

import "server-only";

import { and, desc, eq, lt } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type SnapshotRow = typeof schema.monthlySnapshots.$inferSelect;

export async function listSnapshots(): Promise<SnapshotRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.monthlySnapshots)
    .where(eq(schema.monthlySnapshots.userId, user.id))
    .orderBy(desc(schema.monthlySnapshots.referenceMonth));
}

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

/**
 * Returns the most recent snapshot strictly before `referenceMonth`. Used
 * to compute cumulative total_save when generating a new snapshot.
 */
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

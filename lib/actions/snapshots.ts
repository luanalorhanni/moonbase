"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { aggregateMonth } from "@/lib/finance/aggregate";
import { isMonthRef, sumNumeric, type MonthRef } from "@/lib/finance/month";
import { buildMonthlySnapshot } from "@/lib/finance/snapshots";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { getPreviousSnapshot, getSnapshot } from "@/lib/queries/snapshots";

export type SnapshotActionResult = { ok: true } | { ok: false; error: string };

/**
 * Generates (or recomputes) the monthly snapshot for the given reference
 * month. Idempotent — overwrites an existing snapshot row, which is the
 * intended behaviour when the user explicitly hits "Recalcular".
 *
 * Reads the full dataset (so the parcel/fixed/cash/income filters all use
 * the same pure logic as the month and year views) and the current
 * investment balances for the totals.
 */
export async function upsertMonthlySnapshot(reference: MonthRef): Promise<SnapshotActionResult> {
  if (!isMonthRef(reference)) {
    return { ok: false, error: "invalid month." };
  }

  const user = await requireUser();
  const dataset = await loadFullDataset();
  const aggregate = aggregateMonth(toAggregateInputs(dataset), reference);

  const [liquidRows, fixedRows] = await Promise.all([
    db
      .select({ latestYield: schema.liquidSavings.latestYield })
      .from(schema.liquidSavings)
      .where(
        and(eq(schema.liquidSavings.userId, user.id), eq(schema.liquidSavings.isActive, true)),
      ),
    db
      .select({ latestYield: schema.fixedIncome.latestYield })
      .from(schema.fixedIncome)
      .where(and(eq(schema.fixedIncome.userId, user.id), eq(schema.fixedIncome.isActive, true))),
  ]);

  const liquidSavingsTotal = sumNumeric(liquidRows.map((r) => r.latestYield));
  const fixedIncomeTotal = sumNumeric(fixedRows.map((r) => r.latestYield));

  const previousReference = `${reference}-01`;
  const previous = await getPreviousSnapshot(previousReference);
  const previousTotalSave = previous?.totalSave ?? "0.00";

  const payload = buildMonthlySnapshot({
    aggregate,
    liquidSavingsTotal,
    fixedIncomeTotal,
    previousTotalSave,
  });

  const existing = await getSnapshot(payload.referenceMonth);
  if (existing) {
    await db
      .update(schema.monthlySnapshots)
      .set({
        monthLabel: payload.monthLabel,
        totalIncomes: payload.totalIncomes,
        totalExpenses: payload.totalExpenses,
        totalSave: payload.totalSave,
        totalLiquidSavings: payload.totalLiquidSavings,
        totalFixedIncome: payload.totalFixedIncome,
        generatedAt: new Date(),
      })
      .where(
        and(
          eq(schema.monthlySnapshots.id, existing.id),
          eq(schema.monthlySnapshots.userId, user.id),
        ),
      );
  } else {
    await db.insert(schema.monthlySnapshots).values({
      userId: user.id,
      monthLabel: payload.monthLabel,
      referenceMonth: payload.referenceMonth,
      totalIncomes: payload.totalIncomes,
      totalExpenses: payload.totalExpenses,
      totalSave: payload.totalSave,
      totalLiquidSavings: payload.totalLiquidSavings,
      totalFixedIncome: payload.totalFixedIncome,
    });
  }

  invalidate(TAGS.snapshots);
  revalidatePath("/snapshots");
  revalidatePath(`/month/${reference}`);
  return { ok: true };
}

export async function deleteMonthlySnapshot(id: string): Promise<SnapshotActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.monthlySnapshots)
    .where(and(eq(schema.monthlySnapshots.id, id), eq(schema.monthlySnapshots.userId, user.id)));
  invalidate(TAGS.snapshots);
  revalidatePath("/snapshots");
  return { ok: true };
}

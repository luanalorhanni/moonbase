"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import {
  investmentUpdateSchema,
  type InvestmentUpdateInput,
} from "@/lib/validation/investment-updates";

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenIssues(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

/**
 * Upsert a balance update. If the user already recorded a value for
 * this (investment, day) the row is replaced — keeps the unique
 * constraint happy and matches user intent ("I'm correcting today's
 * number"). The parent investment's `latestYield` and `lastUpdateDate`
 * are kept in sync with whichever update is most recent so the existing
 * KPIs and the table on /investments reflect the new value with no
 * extra plumbing.
 */
export async function recordInvestmentUpdate(input: InvestmentUpdateInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = investmentUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = parsed.data;

  // Confirm the parent investment exists and belongs to the user.
  const parentTable =
    data.investmentKind === "liquid_savings" ? schema.liquidSavings : schema.fixedIncome;
  const parent = await db
    .select({ id: parentTable.id })
    .from(parentTable)
    .where(and(eq(parentTable.id, data.investmentId), eq(parentTable.userId, user.id)))
    .limit(1);
  if (parent.length === 0) {
    return { ok: false, error: "investment not found." };
  }

  await db
    .insert(schema.investmentUpdates)
    .values({
      userId: user.id,
      investmentKind: data.investmentKind,
      investmentId: data.investmentId,
      recordedOn: data.recordedOn,
      currentValue: data.currentValue,
      notes: data.notes,
    })
    .onConflictDoUpdate({
      target: [
        schema.investmentUpdates.investmentKind,
        schema.investmentUpdates.investmentId,
        schema.investmentUpdates.recordedOn,
      ],
      set: {
        currentValue: data.currentValue,
        notes: data.notes,
      },
    });

  // Re-derive the parent's latestYield/lastUpdateDate from the most
  // recent update overall (not necessarily this one — the user might
  // have just back-filled an older date).
  const latest = await db
    .select({
      currentValue: schema.investmentUpdates.currentValue,
      recordedOn: schema.investmentUpdates.recordedOn,
    })
    .from(schema.investmentUpdates)
    .where(
      and(
        eq(schema.investmentUpdates.userId, user.id),
        eq(schema.investmentUpdates.investmentKind, data.investmentKind),
        eq(schema.investmentUpdates.investmentId, data.investmentId),
      ),
    )
    .orderBy(schema.investmentUpdates.recordedOn)
    .limit(1000);

  if (latest.length > 0) {
    const newest = latest.reduce((a, b) => (a.recordedOn > b.recordedOn ? a : b));
    await db
      .update(parentTable)
      .set({ latestYield: newest.currentValue, lastUpdateDate: newest.recordedOn })
      .where(and(eq(parentTable.id, data.investmentId), eq(parentTable.userId, user.id)));
  }

  invalidate(TAGS.investmentUpdates);
  invalidate(
    data.investmentKind === "liquid_savings" ? TAGS.liquidSavings : TAGS.fixedIncome,
  );
  revalidatePath("/investments");
  return { ok: true };
}

export async function deleteInvestmentUpdate(updateId: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!updateId) return { ok: false, error: "id is required." };

  // Read the row first so we know which parent to re-sync afterwards.
  const target = await db
    .select()
    .from(schema.investmentUpdates)
    .where(
      and(
        eq(schema.investmentUpdates.id, updateId),
        eq(schema.investmentUpdates.userId, user.id),
      ),
    )
    .limit(1);
  const row = target[0];
  if (!row) return { ok: false, error: "update not found." };

  await db
    .delete(schema.investmentUpdates)
    .where(
      and(
        eq(schema.investmentUpdates.id, updateId),
        eq(schema.investmentUpdates.userId, user.id),
      ),
    );

  // Re-sync parent: if there are any remaining updates, point at the
  // most recent one; otherwise reset to the applied amount on the
  // application date so the gain reads as zero.
  const remaining = await db
    .select({
      currentValue: schema.investmentUpdates.currentValue,
      recordedOn: schema.investmentUpdates.recordedOn,
    })
    .from(schema.investmentUpdates)
    .where(
      and(
        eq(schema.investmentUpdates.userId, user.id),
        eq(schema.investmentUpdates.investmentKind, row.investmentKind),
        eq(schema.investmentUpdates.investmentId, row.investmentId),
      ),
    );

  const parentTable =
    row.investmentKind === "liquid_savings" ? schema.liquidSavings : schema.fixedIncome;

  if (remaining.length === 0) {
    const parent = await db
      .select({
        appliedAmount: parentTable.appliedAmount,
        applicationDate: parentTable.applicationDate,
      })
      .from(parentTable)
      .where(and(eq(parentTable.id, row.investmentId), eq(parentTable.userId, user.id)))
      .limit(1);
    if (parent[0]) {
      await db
        .update(parentTable)
        .set({ latestYield: parent[0].appliedAmount, lastUpdateDate: null })
        .where(and(eq(parentTable.id, row.investmentId), eq(parentTable.userId, user.id)));
    }
  } else {
    const newest = remaining.reduce((a, b) => (a.recordedOn > b.recordedOn ? a : b));
    await db
      .update(parentTable)
      .set({ latestYield: newest.currentValue, lastUpdateDate: newest.recordedOn })
      .where(and(eq(parentTable.id, row.investmentId), eq(parentTable.userId, user.id)));
  }

  invalidate(TAGS.investmentUpdates);
  invalidate(
    row.investmentKind === "liquid_savings" ? TAGS.liquidSavings : TAGS.fixedIncome,
  );
  revalidatePath("/investments");
  return { ok: true };
}

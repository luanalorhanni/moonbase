"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { todayBrazil } from "@/lib/utils";
import {
  cashExpenseFormSchema,
  normaliseCashExpenseForm,
  type CashExpenseFormInput,
} from "@/lib/validation/cash-expense";

export type CashExpenseActionResult =
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

const todayStr = todayBrazil;

type TxLike = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Decrement (or increment, when delta > 0 with negative amount) the
 *  savings' current balance (latest_yield) by `delta`. Stamps last_update_date
 *  with today. Caller passes a Drizzle tx so the operation is atomic with the
 *  surrounding expense write. */
async function adjustLiquidSavings(
  tx: TxLike,
  userId: string,
  liquidSavingsId: string,
  delta: number,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (delta === 0) return { ok: true };
  const rows = await tx
    .select({ id: schema.liquidSavings.id, latestYield: schema.liquidSavings.latestYield })
    .from(schema.liquidSavings)
    .where(
      and(eq(schema.liquidSavings.id, liquidSavingsId), eq(schema.liquidSavings.userId, userId)),
    )
    .limit(1);
  const row = rows[0];
  if (!row) return { ok: false, error: "liquid savings not found." };
  const next = (Number(row.latestYield) + delta).toFixed(2);
  await tx
    .update(schema.liquidSavings)
    .set({ latestYield: next, lastUpdateDate: todayStr() })
    .where(eq(schema.liquidSavings.id, liquidSavingsId));
  return { ok: true };
}

export async function createCashExpense(
  input: CashExpenseFormInput,
): Promise<CashExpenseActionResult> {
  const user = await requireUser();
  const parsed = cashExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCashExpenseForm(parsed.data);

  try {
    await db.transaction(async (tx) => {
      await tx.insert(schema.cashExpenses).values({ userId: user.id, ...data });
      if (data.liquidSavingsId) {
        const result = await adjustLiquidSavings(
          tx,
          user.id,
          data.liquidSavingsId,
          -Number(data.amount),
        );
        if (!result.ok) throw new Error(result.error);
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to save.";
    return { ok: false, error: message };
  }

  invalidate(TAGS.cashExpenses, TAGS.liquidSavings);
  revalidatePath("/expenses/cash");
  revalidatePath("/investments");
  revalidatePath("/");
  return { ok: true };
}

export async function updateCashExpense(
  id: string,
  input: CashExpenseFormInput,
): Promise<CashExpenseActionResult> {
  const user = await requireUser();
  const parsed = cashExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCashExpenseForm(parsed.data);

  try {
    await db.transaction(async (tx) => {
      // Read prior state so we can reverse the previous deduction (if any)
      // before applying the new one.
      const priorRows = await tx
        .select({
          amount: schema.cashExpenses.amount,
          liquidSavingsId: schema.cashExpenses.liquidSavingsId,
        })
        .from(schema.cashExpenses)
        .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)))
        .limit(1);
      const prior = priorRows[0];
      if (!prior) throw new Error("expense not found.");

      // Revert previous deduction.
      if (prior.liquidSavingsId) {
        const revert = await adjustLiquidSavings(
          tx,
          user.id,
          prior.liquidSavingsId,
          Number(prior.amount),
        );
        if (!revert.ok) throw new Error(revert.error);
      }

      // Update the row.
      await tx
        .update(schema.cashExpenses)
        .set(data)
        .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)));

      // Apply new deduction.
      if (data.liquidSavingsId) {
        const apply = await adjustLiquidSavings(
          tx,
          user.id,
          data.liquidSavingsId,
          -Number(data.amount),
        );
        if (!apply.ok) throw new Error(apply.error);
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to save.";
    return { ok: false, error: message };
  }

  invalidate(TAGS.cashExpenses, TAGS.liquidSavings);
  revalidatePath("/expenses/cash");
  revalidatePath("/investments");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteCashExpense(id: string): Promise<CashExpenseActionResult> {
  const user = await requireUser();
  try {
    await db.transaction(async (tx) => {
      const priorRows = await tx
        .select({
          amount: schema.cashExpenses.amount,
          liquidSavingsId: schema.cashExpenses.liquidSavingsId,
        })
        .from(schema.cashExpenses)
        .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)))
        .limit(1);
      const prior = priorRows[0];

      await tx
        .delete(schema.cashExpenses)
        .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)));

      // Reverse the deduction (add the amount back to the cofrinho).
      if (prior?.liquidSavingsId) {
        const revert = await adjustLiquidSavings(
          tx,
          user.id,
          prior.liquidSavingsId,
          Number(prior.amount),
        );
        if (!revert.ok) throw new Error(revert.error);
      }
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "failed to delete.";
    return { ok: false, error: message };
  }

  invalidate(TAGS.cashExpenses, TAGS.liquidSavings);
  revalidatePath("/expenses/cash");
  revalidatePath("/investments");
  revalidatePath("/");
  return { ok: true };
}

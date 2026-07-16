"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { shiftMonth } from "@/lib/finance/month";
import {
  creditRefundFormSchema,
  normaliseCreditRefundForm,
  type CreditRefundFormInput,
} from "@/lib/validation/credit-refund";

export type CreditRefundActionResult =
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
 * Last invoice month the refund credit lands on. A single-month refund
 * (totalParcels = 1) equals referenceMonth; an estorno parcelado extends
 * forward. `referenceMonth` arrives as `yyyy-mm-01`.
 */
function deriveLastParcelMonth(referenceMonth: string, totalParcels: number): string {
  const last = shiftMonth(referenceMonth.slice(0, 7), totalParcels - 1);
  return `${last}-01`;
}

export async function createCreditRefund(
  input: CreditRefundFormInput,
): Promise<CreditRefundActionResult> {
  const user = await requireUser();
  const parsed = creditRefundFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCreditRefundForm(parsed.data);

  // Ownership check — the refund must attach to one of the user's expenses.
  const parent = await db
    .select({ id: schema.creditExpenses.id })
    .from(schema.creditExpenses)
    .where(
      and(
        eq(schema.creditExpenses.id, data.creditExpenseId),
        eq(schema.creditExpenses.userId, user.id),
      ),
    )
    .limit(1);
  if (!parent[0]) return { ok: false, error: "expense not found." };

  await db.insert(schema.creditRefunds).values({
    userId: user.id,
    creditExpenseId: data.creditExpenseId,
    description: data.description,
    parcelValue: data.parcelValue,
    totalParcels: data.totalParcels,
    referenceMonth: data.referenceMonth,
    lastParcelMonth: deriveLastParcelMonth(data.referenceMonth, data.totalParcels),
  });

  invalidate(TAGS.creditRefunds);
  revalidatePath("/expenses/credit");
  return { ok: true };
}

export async function deleteCreditRefund(id: string): Promise<CreditRefundActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.creditRefunds)
    .where(and(eq(schema.creditRefunds.id, id), eq(schema.creditRefunds.userId, user.id)));
  invalidate(TAGS.creditRefunds);
  revalidatePath("/expenses/credit");
  return { ok: true };
}

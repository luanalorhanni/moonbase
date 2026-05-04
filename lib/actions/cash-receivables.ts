"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import {
  cashReceivableFormSchema,
  normaliseCashReceivableForm,
  type CashReceivableFormInput,
} from "@/lib/validation/cash-receivable";

export type CashReceivableActionResult =
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

export async function createCashReceivable(
  input: CashReceivableFormInput,
): Promise<CashReceivableActionResult> {
  const user = await requireUser();
  const parsed = cashReceivableFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCashReceivableForm(parsed.data);
  await db.insert(schema.cashReceivables).values({
    userId: user.id,
    description: data.description,
    loanType: data.loanType,
    amount: data.amount,
    loanDate: data.loanDate,
    expectedPaymentMonth: data.expectedPaymentMonth,
    isPaid: data.isPaid,
    actualPaymentDate: data.actualPaymentDate,
  });

  invalidate(TAGS.cashReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

export async function updateCashReceivable(
  id: string,
  input: CashReceivableFormInput,
): Promise<CashReceivableActionResult> {
  const user = await requireUser();
  const parsed = cashReceivableFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCashReceivableForm(parsed.data);
  await db
    .update(schema.cashReceivables)
    .set({
      description: data.description,
      loanType: data.loanType,
      amount: data.amount,
      loanDate: data.loanDate,
      expectedPaymentMonth: data.expectedPaymentMonth,
      isPaid: data.isPaid,
      actualPaymentDate: data.actualPaymentDate,
    })
    .where(and(eq(schema.cashReceivables.id, id), eq(schema.cashReceivables.userId, user.id)));

  invalidate(TAGS.cashReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

export async function markCashReceivableAsPaid(id: string): Promise<CashReceivableActionResult> {
  const user = await requireUser();
  const today = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;

  await db
    .update(schema.cashReceivables)
    .set({ isPaid: true, actualPaymentDate: todayStr })
    .where(and(eq(schema.cashReceivables.id, id), eq(schema.cashReceivables.userId, user.id)));

  invalidate(TAGS.cashReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

export async function deleteCashReceivable(id: string): Promise<CashReceivableActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.cashReceivables)
    .where(and(eq(schema.cashReceivables.id, id), eq(schema.cashReceivables.userId, user.id)));
  invalidate(TAGS.cashReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import {
  fixedExpenseFormSchema,
  normaliseFixedExpenseForm,
  type FixedExpenseFormInput,
} from "@/lib/validation/fixed-expense";

export type FixedExpenseActionResult =
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

export async function createFixedExpense(
  input: FixedExpenseFormInput,
): Promise<FixedExpenseActionResult> {
  const user = await requireUser();
  const parsed = fixedExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseFixedExpenseForm(parsed.data);
  await db.insert(schema.fixedExpenses).values({
    userId: user.id,
    description: data.description,
    cardId: data.cardId,
    subcategoryId: data.subcategoryId,
    paymentMethod: data.paymentMethod,
    monthlyAmount: data.monthlyAmount,
    dueDay: data.dueDay,
    startDate: data.startDate,
    endDate: data.endDate,
    isActive: data.isActive,
  });

  revalidatePath("/expenses/fixed");
  return { ok: true };
}

export async function updateFixedExpense(
  id: string,
  input: FixedExpenseFormInput,
): Promise<FixedExpenseActionResult> {
  const user = await requireUser();
  const parsed = fixedExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseFixedExpenseForm(parsed.data);
  await db
    .update(schema.fixedExpenses)
    .set({
      description: data.description,
      cardId: data.cardId,
      subcategoryId: data.subcategoryId,
      paymentMethod: data.paymentMethod,
      monthlyAmount: data.monthlyAmount,
      dueDay: data.dueDay,
      startDate: data.startDate,
      endDate: data.endDate,
      isActive: data.isActive,
    })
    .where(and(eq(schema.fixedExpenses.id, id), eq(schema.fixedExpenses.userId, user.id)));

  revalidatePath("/expenses/fixed");
  return { ok: true };
}

export async function deleteFixedExpense(id: string): Promise<FixedExpenseActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.fixedExpenses)
    .where(and(eq(schema.fixedExpenses.id, id), eq(schema.fixedExpenses.userId, user.id)));
  revalidatePath("/expenses/fixed");
  return { ok: true };
}

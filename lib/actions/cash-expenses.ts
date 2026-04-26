"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
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

export async function createCashExpense(
  input: CashExpenseFormInput,
): Promise<CashExpenseActionResult> {
  const user = await requireUser();
  const parsed = cashExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCashExpenseForm(parsed.data);
  await db.insert(schema.cashExpenses).values({ userId: user.id, ...data });
  invalidate(TAGS.cashExpenses);
  revalidatePath("/expenses/cash");
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
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCashExpenseForm(parsed.data);
  await db
    .update(schema.cashExpenses)
    .set(data)
    .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)));
  invalidate(TAGS.cashExpenses);
  revalidatePath("/expenses/cash");
  return { ok: true };
}

export async function deleteCashExpense(id: string): Promise<CashExpenseActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.cashExpenses)
    .where(and(eq(schema.cashExpenses.id, id), eq(schema.cashExpenses.userId, user.id)));
  invalidate(TAGS.cashExpenses);
  revalidatePath("/expenses/cash");
  return { ok: true };
}

"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import {
  incomeFormSchema,
  normaliseIncomeForm,
  type IncomeFormInput,
} from "@/lib/validation/income";

export type IncomeActionResult =
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

export async function createIncome(input: IncomeFormInput): Promise<IncomeActionResult> {
  const user = await requireUser();
  const parsed = incomeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseIncomeForm(parsed.data);
  await db.insert(schema.incomes).values({ userId: user.id, ...data });
  revalidatePath("/incomes");
  return { ok: true };
}

export async function updateIncome(
  id: string,
  input: IncomeFormInput,
): Promise<IncomeActionResult> {
  const user = await requireUser();
  const parsed = incomeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseIncomeForm(parsed.data);
  await db
    .update(schema.incomes)
    .set(data)
    .where(and(eq(schema.incomes.id, id), eq(schema.incomes.userId, user.id)));
  revalidatePath("/incomes");
  return { ok: true };
}

export async function deleteIncome(id: string): Promise<IncomeActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.incomes)
    .where(and(eq(schema.incomes.id, id), eq(schema.incomes.userId, user.id)));
  revalidatePath("/incomes");
  return { ok: true };
}

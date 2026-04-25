"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import {
  fixedIncomeFormSchema,
  liquidSavingsFormSchema,
  normaliseFixedIncomeForm,
  normaliseLiquidSavingsForm,
  type FixedIncomeFormInput,
  type LiquidSavingsFormInput,
} from "@/lib/validation/investment";

export type InvestmentActionResult =
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

// ── Liquid savings ──────────────────────────────────────────────────────────

export async function createLiquidSavings(
  input: LiquidSavingsFormInput,
): Promise<InvestmentActionResult> {
  const user = await requireUser();
  const parsed = liquidSavingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseLiquidSavingsForm(parsed.data);
  await db.insert(schema.liquidSavings).values({ userId: user.id, ...data });
  revalidatePath("/investments");
  return { ok: true };
}

export async function updateLiquidSavings(
  id: string,
  input: LiquidSavingsFormInput,
): Promise<InvestmentActionResult> {
  const user = await requireUser();
  const parsed = liquidSavingsFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseLiquidSavingsForm(parsed.data);
  await db
    .update(schema.liquidSavings)
    .set(data)
    .where(and(eq(schema.liquidSavings.id, id), eq(schema.liquidSavings.userId, user.id)));
  revalidatePath("/investments");
  return { ok: true };
}

export async function deleteLiquidSavings(id: string): Promise<InvestmentActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.liquidSavings)
    .where(and(eq(schema.liquidSavings.id, id), eq(schema.liquidSavings.userId, user.id)));
  revalidatePath("/investments");
  return { ok: true };
}

// ── Fixed income ─────────────────────────────────────────────────────────────

export async function createFixedIncome(
  input: FixedIncomeFormInput,
): Promise<InvestmentActionResult> {
  const user = await requireUser();
  const parsed = fixedIncomeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseFixedIncomeForm(parsed.data);
  await db.insert(schema.fixedIncome).values({ userId: user.id, ...data });
  revalidatePath("/investments");
  return { ok: true };
}

export async function updateFixedIncome(
  id: string,
  input: FixedIncomeFormInput,
): Promise<InvestmentActionResult> {
  const user = await requireUser();
  const parsed = fixedIncomeFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseFixedIncomeForm(parsed.data);
  await db
    .update(schema.fixedIncome)
    .set(data)
    .where(and(eq(schema.fixedIncome.id, id), eq(schema.fixedIncome.userId, user.id)));
  revalidatePath("/investments");
  return { ok: true };
}

export async function deleteFixedIncome(id: string): Promise<InvestmentActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.fixedIncome)
    .where(and(eq(schema.fixedIncome.id, id), eq(schema.fixedIncome.userId, user.id)));
  revalidatePath("/investments");
  return { ok: true };
}

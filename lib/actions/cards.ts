"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import { cardFormSchema, normaliseCardForm, type CardFormInput } from "@/lib/validation/card";

export type CardActionResult =
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

export async function createCard(input: CardFormInput): Promise<CardActionResult> {
  const user = await requireUser();
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCardForm(parsed.data);
  await db.insert(schema.cards).values({
    userId: user.id,
    name: data.name,
    type: data.type,
    bank: data.bank,
    defaultClosingDay: data.defaultClosingDay,
    dueDay: data.dueDay,
    limitAmount: data.limitAmount,
    color: data.color,
    isActive: data.isActive,
  });

  revalidatePath("/cards");
  return { ok: true };
}

export async function updateCard(id: string, input: CardFormInput): Promise<CardActionResult> {
  const user = await requireUser();
  const parsed = cardFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCardForm(parsed.data);
  await db
    .update(schema.cards)
    .set({
      name: data.name,
      type: data.type,
      bank: data.bank,
      defaultClosingDay: data.defaultClosingDay,
      dueDay: data.dueDay,
      limitAmount: data.limitAmount,
      color: data.color,
      isActive: data.isActive,
    })
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)));

  revalidatePath("/cards");
  return { ok: true };
}

export async function deleteCard(id: string): Promise<CardActionResult> {
  const user = await requireUser();

  try {
    await db
      .delete(schema.cards)
      .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)));
  } catch (error) {
    // FK violations (the card is referenced by an expense, receivable, etc.)
    // surface as "23503". Surface a calm message rather than a stack trace.
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23503"
    ) {
      return {
        ok: false,
        error: "Este cartão tem despesas ou receivables associados e não pode ser excluído.",
      };
    }
    throw error;
  }

  revalidatePath("/cards");
  return { ok: true };
}

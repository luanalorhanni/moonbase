"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { computeParcelDates } from "@/lib/finance/parcels";
import {
  creditExpenseFormSchema,
  normaliseCreditExpenseForm,
  type CreditExpenseFormInput,
} from "@/lib/validation/credit-expense";

export type CreditExpenseActionResult =
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

function parseLocalDate(str: string): Date {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function deriveParcelDates(
  cardId: string,
  userId: string,
  purchaseDate: string,
  totalParcels: number,
): Promise<
  { ok: true; dates: ReturnType<typeof computeParcelDates> } | { ok: false; error: string }
> {
  const [cardRows, cardClosingRows] = await Promise.all([
    db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, userId)))
      .limit(1),
    db.select().from(schema.cardClosings).where(eq(schema.cardClosings.cardId, cardId)),
  ]);

  const card = cardRows[0];
  if (!card) return { ok: false, error: "card not found." };
  if (card.type !== "credit") return { ok: false, error: "select a credit card." };
  if (card.defaultClosingDay === null) {
    return { ok: false, error: "set the card's closing day first." };
  }

  const closings = cardClosingRows.map((cc) => ({
    cardId: cc.cardId,
    referenceMonth: parseLocalDate(cc.referenceMonth),
    closingDay: cc.closingDay,
  }));

  const dates = computeParcelDates({
    card: { id: card.id, defaultClosingDay: card.defaultClosingDay },
    purchaseDate: parseLocalDate(purchaseDate),
    totalParcels,
    cardClosings: closings,
  });

  return { ok: true, dates };
}

export async function createCreditExpense(
  input: CreditExpenseFormInput,
): Promise<CreditExpenseActionResult> {
  const user = await requireUser();
  const parsed = creditExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCreditExpenseForm(parsed.data);
  const derived = await deriveParcelDates(
    data.cardId,
    user.id,
    data.purchaseDate,
    data.totalParcels,
  );
  if (!derived.ok) return { ok: false, error: derived.error };

  const { dates } = derived;
  await db.insert(schema.creditExpenses).values({
    userId: user.id,
    description: data.description,
    cardId: data.cardId,
    subcategoryId: data.subcategoryId,
    purchaseDate: data.purchaseDate,
    totalParcels: data.totalParcels,
    parcelValue: data.parcelValue,
    firstParcelDate: toDateStr(dates.firstParcelDate),
    lastParcelDate: toDateStr(dates.lastParcelDate),
    firstParcelMonth: toDateStr(dates.firstParcelMonth),
    lastParcelMonth: toDateStr(dates.lastParcelMonth),
    manualOverride: data.manualOverride,
  });

  invalidate(TAGS.creditExpenses);
  revalidatePath("/expenses/credit");
  return { ok: true };
}

export async function updateCreditExpense(
  id: string,
  input: CreditExpenseFormInput,
): Promise<CreditExpenseActionResult> {
  const user = await requireUser();
  const parsed = creditExpenseFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCreditExpenseForm(parsed.data);
  const where = and(eq(schema.creditExpenses.id, id), eq(schema.creditExpenses.userId, user.id));

  if (data.manualOverride) {
    // Keep existing derived dates — only update editable fields.
    await db
      .update(schema.creditExpenses)
      .set({
        description: data.description,
        subcategoryId: data.subcategoryId,
        parcelValue: data.parcelValue,
        manualOverride: true,
      })
      .where(where);
  } else {
    const derived = await deriveParcelDates(
      data.cardId,
      user.id,
      data.purchaseDate,
      data.totalParcels,
    );
    if (!derived.ok) return { ok: false, error: derived.error };

    const { dates } = derived;
    await db
      .update(schema.creditExpenses)
      .set({
        description: data.description,
        cardId: data.cardId,
        subcategoryId: data.subcategoryId,
        purchaseDate: data.purchaseDate,
        totalParcels: data.totalParcels,
        parcelValue: data.parcelValue,
        firstParcelDate: toDateStr(dates.firstParcelDate),
        lastParcelDate: toDateStr(dates.lastParcelDate),
        firstParcelMonth: toDateStr(dates.firstParcelMonth),
        lastParcelMonth: toDateStr(dates.lastParcelMonth),
        manualOverride: false,
      })
      .where(where);
  }

  invalidate(TAGS.creditExpenses);
  revalidatePath("/expenses/credit");
  return { ok: true };
}

export async function deleteCreditExpense(id: string): Promise<CreditExpenseActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.creditExpenses)
    .where(and(eq(schema.creditExpenses.id, id), eq(schema.creditExpenses.userId, user.id)));
  invalidate(TAGS.creditExpenses);
  revalidatePath("/expenses/credit");
  return { ok: true };
}

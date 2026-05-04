"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { computeParcelDates } from "@/lib/finance/parcels";
import {
  creditReceivableFormSchema,
  normaliseCreditReceivableForm,
  type CreditReceivableFormInput,
} from "@/lib/validation/credit-receivable";

export type CreditReceivableActionResult =
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

export async function createCreditReceivable(
  input: CreditReceivableFormInput,
): Promise<CreditReceivableActionResult> {
  const user = await requireUser();
  const parsed = creditReceivableFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCreditReceivableForm(parsed.data);
  const derived = await deriveParcelDates(
    data.cardId,
    user.id,
    data.purchaseDate,
    data.totalParcels,
  );
  if (!derived.ok) return { ok: false, error: derived.error };

  const { dates } = derived;
  await db.insert(schema.creditReceivables).values({
    userId: user.id,
    description: data.description,
    cardId: data.cardId,
    purchaseDate: data.purchaseDate,
    totalParcels: data.totalParcels,
    parcelValue: data.parcelValue,
    firstParcelDate: toDateStr(dates.firstParcelDate),
    lastParcelDate: toDateStr(dates.lastParcelDate),
    firstParcelMonth: toDateStr(dates.firstParcelMonth),
    lastParcelMonth: toDateStr(dates.lastParcelMonth),
    manualOverride: data.manualOverride,
  });

  invalidate(TAGS.creditReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

export async function updateCreditReceivable(
  id: string,
  input: CreditReceivableFormInput,
): Promise<CreditReceivableActionResult> {
  const user = await requireUser();
  const parsed = creditReceivableFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }

  const data = normaliseCreditReceivableForm(parsed.data);
  const where = and(
    eq(schema.creditReceivables.id, id),
    eq(schema.creditReceivables.userId, user.id),
  );

  if (data.manualOverride) {
    await db
      .update(schema.creditReceivables)
      .set({ description: data.description, parcelValue: data.parcelValue, manualOverride: true })
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
      .update(schema.creditReceivables)
      .set({
        description: data.description,
        cardId: data.cardId,
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

  invalidate(TAGS.creditReceivables);
  revalidatePath("/receivables");
  return { ok: true };
}

export async function deleteCreditReceivable(id: string): Promise<CreditReceivableActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.creditReceivables)
    .where(and(eq(schema.creditReceivables.id, id), eq(schema.creditReceivables.userId, user.id)));
  invalidate(TAGS.creditReceivables, TAGS.creditReceivableParcelsPaid);
  revalidatePath("/receivables");
  return { ok: true };
}

/**
 * Toggle a single parcel's paid status for a credit receivable.
 * If `paid` is true, inserts a row (no-op if already exists).
 * If false, deletes the row (no-op if absent).
 */
export async function toggleCreditParcelPaid(
  receivableId: string,
  parcelNumber: number,
  paid: boolean,
): Promise<CreditReceivableActionResult> {
  const user = await requireUser();

  if (paid) {
    await db
      .insert(schema.creditReceivableParcelsPaid)
      .values({ userId: user.id, receivableId, parcelNumber })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.creditReceivableParcelsPaid)
      .where(
        and(
          eq(schema.creditReceivableParcelsPaid.userId, user.id),
          eq(schema.creditReceivableParcelsPaid.receivableId, receivableId),
          eq(schema.creditReceivableParcelsPaid.parcelNumber, parcelNumber),
        ),
      );
  }

  invalidate(TAGS.creditReceivableParcelsPaid);
  revalidatePath("/receivables");
  return { ok: true };
}

/**
 * Mark all parcels in a given reference month as paid (or unpaid). Each item
 * is `(receivableId, parcelNumber)` — the caller computes which parcels fall
 * in the month from `firstParcelMonth`/`totalParcels`.
 */
export async function setMonthParcelsPaid(
  parcels: Array<{ receivableId: string; parcelNumber: number }>,
  paid: boolean,
): Promise<CreditReceivableActionResult> {
  const user = await requireUser();
  if (parcels.length === 0) return { ok: true };

  if (paid) {
    await db
      .insert(schema.creditReceivableParcelsPaid)
      .values(
        parcels.map((p) => ({
          userId: user.id,
          receivableId: p.receivableId,
          parcelNumber: p.parcelNumber,
        })),
      )
      .onConflictDoNothing();
  } else {
    // Drizzle has no compound `IN ((id, n), …)` helper, so delete by
    // receivable then filter parcel numbers — for typical months this is a
    // small set so individual statements are fine.
    const byReceivable = new Map<string, number[]>();
    for (const p of parcels) {
      const list = byReceivable.get(p.receivableId);
      if (list) list.push(p.parcelNumber);
      else byReceivable.set(p.receivableId, [p.parcelNumber]);
    }
    for (const [receivableId, nums] of byReceivable) {
      await db
        .delete(schema.creditReceivableParcelsPaid)
        .where(
          and(
            eq(schema.creditReceivableParcelsPaid.userId, user.id),
            eq(schema.creditReceivableParcelsPaid.receivableId, receivableId),
            inArray(schema.creditReceivableParcelsPaid.parcelNumber, nums),
          ),
        );
    }
  }

  invalidate(TAGS.creditReceivableParcelsPaid);
  revalidatePath("/receivables");
  return { ok: true };
}

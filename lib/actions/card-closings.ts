"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { computeParcelDates } from "@/lib/finance/parcels";

export type CardClosingsActionResult = { ok: true } | { ok: false; error: string };

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

export type ClosingOverrideInput = {
  /** First day of the month, yyyy-mm-01. */
  referenceMonth: string;
  /** Closing day 1-31, or null to delete this month's override. */
  closingDay: number | null;
  /** Due day 1-31, or null to inherit from the card default. */
  dueDay: number | null;
};

/**
 * Replace the card's closing/due overrides for the supplied months.
 *
 * - Each input row is keyed by `(card_id, reference_month)`.
 * - When `closingDay` is null the row is deleted (acts as "remove
 *   override; carry-forward will use a prior month or the card default").
 * - After applying, every credit_expense and credit_receivable on this
 *   card with `manual_override = false` is recomputed so any month/date
 *   shift is reflected immediately. Manually-overridden rows are left
 *   alone so the user's hand-fixed entries don't get clobbered.
 */
export async function saveCardClosings(
  cardId: string,
  overrides: ClosingOverrideInput[],
): Promise<CardClosingsActionResult> {
  const user = await requireUser();

  // Confirm the card belongs to the user (also gives us defaults for recompute).
  const cardRows = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, user.id)))
    .limit(1);
  const card = cardRows[0];
  if (!card) return { ok: false, error: "Cartão não encontrado." };
  if (card.type !== "credit") {
    return { ok: false, error: "Apenas cartões de crédito têm fechamento." };
  }
  if (card.defaultClosingDay === null) {
    return { ok: false, error: "Configure o dia de fechamento padrão do cartão primeiro." };
  }

  // Validate inputs before touching the DB.
  for (const row of overrides) {
    if (!/^\d{4}-\d{2}-01$/.test(row.referenceMonth)) {
      return { ok: false, error: `Mês inválido: ${row.referenceMonth}` };
    }
    if (row.closingDay !== null && (row.closingDay < 1 || row.closingDay > 31)) {
      return { ok: false, error: `Fechamento fora do intervalo (${row.closingDay}).` };
    }
    if (row.dueDay !== null && (row.dueDay < 1 || row.dueDay > 31)) {
      return { ok: false, error: `Vencimento fora do intervalo (${row.dueDay}).` };
    }
  }

  // Apply the changes. Deletions first (closingDay=null), then upserts.
  const toDelete = overrides.filter((o) => o.closingDay === null).map((o) => o.referenceMonth);
  const toUpsert = overrides.filter(
    (o): o is ClosingOverrideInput & { closingDay: number } => o.closingDay !== null,
  );

  if (toDelete.length > 0) {
    await db
      .delete(schema.cardClosings)
      .where(
        and(
          eq(schema.cardClosings.userId, user.id),
          eq(schema.cardClosings.cardId, cardId),
          inArray(schema.cardClosings.referenceMonth, toDelete),
        ),
      );
  }

  if (toUpsert.length > 0) {
    // Delete-then-insert. Simpler than a Drizzle upsert with EXCLUDED.* and
    // safe because we hold the latest values for every (card, month) the
    // user is editing.
    await db
      .delete(schema.cardClosings)
      .where(
        and(
          eq(schema.cardClosings.userId, user.id),
          eq(schema.cardClosings.cardId, cardId),
          inArray(
            schema.cardClosings.referenceMonth,
            toUpsert.map((o) => o.referenceMonth),
          ),
        ),
      );
    await db.insert(schema.cardClosings).values(
      toUpsert.map((o) => ({
        userId: user.id,
        cardId,
        referenceMonth: o.referenceMonth,
        closingDay: o.closingDay,
        dueDay: o.dueDay,
      })),
    );
  }

  // Recompute any non-manual credit_expenses and credit_receivables on this
  // card. We re-fetch closings to pick up the changes we just wrote.
  await recomputeCardParcels(cardId, user.id);

  invalidate(
    TAGS.cardClosings,
    TAGS.creditExpenses,
    TAGS.creditReceivables,
  );
  revalidatePath("/cards");
  revalidatePath("/expenses/credit");
  revalidatePath("/receivables");
  revalidatePath("/");
  return { ok: true };
}

async function recomputeCardParcels(cardId: string, userId: string): Promise<void> {
  const [cardRows, closingRows, expenses, receivables] = await Promise.all([
    db
      .select()
      .from(schema.cards)
      .where(and(eq(schema.cards.id, cardId), eq(schema.cards.userId, userId)))
      .limit(1),
    db.select().from(schema.cardClosings).where(eq(schema.cardClosings.cardId, cardId)),
    db
      .select()
      .from(schema.creditExpenses)
      .where(
        and(
          eq(schema.creditExpenses.userId, userId),
          eq(schema.creditExpenses.cardId, cardId),
          eq(schema.creditExpenses.manualOverride, false),
        ),
      ),
    db
      .select()
      .from(schema.creditReceivables)
      .where(
        and(
          eq(schema.creditReceivables.userId, userId),
          eq(schema.creditReceivables.cardId, cardId),
          eq(schema.creditReceivables.manualOverride, false),
        ),
      ),
  ]);

  const card = cardRows[0];
  if (!card || card.defaultClosingDay === null) return;

  const closings = closingRows.map((cc) => ({
    cardId: cc.cardId,
    referenceMonth: parseLocalDate(cc.referenceMonth),
    closingDay: cc.closingDay,
    dueDay: cc.dueDay,
  }));
  const cardDef = {
    id: card.id,
    defaultClosingDay: card.defaultClosingDay,
    dueDay: card.dueDay,
  };

  for (const e of expenses) {
    const dates = computeParcelDates({
      card: cardDef,
      purchaseDate: parseLocalDate(e.purchaseDate),
      totalParcels: e.totalParcels,
      cardClosings: closings,
    });
    if (
      e.firstParcelMonth !== toDateStr(dates.firstParcelMonth) ||
      e.lastParcelMonth !== toDateStr(dates.lastParcelMonth) ||
      e.firstParcelDate !== toDateStr(dates.firstParcelDate) ||
      e.lastParcelDate !== toDateStr(dates.lastParcelDate)
    ) {
      await db
        .update(schema.creditExpenses)
        .set({
          firstParcelMonth: toDateStr(dates.firstParcelMonth),
          lastParcelMonth: toDateStr(dates.lastParcelMonth),
          firstParcelDate: toDateStr(dates.firstParcelDate),
          lastParcelDate: toDateStr(dates.lastParcelDate),
        })
        .where(eq(schema.creditExpenses.id, e.id));
    }
  }

  for (const r of receivables) {
    const dates = computeParcelDates({
      card: cardDef,
      purchaseDate: parseLocalDate(r.purchaseDate),
      totalParcels: r.totalParcels,
      cardClosings: closings,
    });
    if (
      r.firstParcelMonth !== toDateStr(dates.firstParcelMonth) ||
      r.lastParcelMonth !== toDateStr(dates.lastParcelMonth) ||
      r.firstParcelDate !== toDateStr(dates.firstParcelDate) ||
      r.lastParcelDate !== toDateStr(dates.lastParcelDate)
    ) {
      await db
        .update(schema.creditReceivables)
        .set({
          firstParcelMonth: toDateStr(dates.firstParcelMonth),
          lastParcelMonth: toDateStr(dates.lastParcelMonth),
          firstParcelDate: toDateStr(dates.firstParcelDate),
          lastParcelDate: toDateStr(dates.lastParcelDate),
        })
        .where(eq(schema.creditReceivables.id, r.id));
    }
  }
}

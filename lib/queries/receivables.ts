import "server-only";

import { asc, desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type CashReceivableRow = typeof schema.cashReceivables.$inferSelect;

export type CreditReceivableRow = typeof schema.creditReceivables.$inferSelect;

export type CreditReceivableWithCard = CreditReceivableRow & {
  cardName: string;
  cardColor: string;
};

export async function listCashReceivables(): Promise<CashReceivableRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.cashReceivables)
    .where(eq(schema.cashReceivables.userId, user.id))
    .orderBy(asc(schema.cashReceivables.isPaid), desc(schema.cashReceivables.loanDate));
}

export async function listCreditReceivables(): Promise<CreditReceivableWithCard[]> {
  const user = await requireUser();
  return db
    .select({
      id: schema.creditReceivables.id,
      userId: schema.creditReceivables.userId,
      description: schema.creditReceivables.description,
      cardId: schema.creditReceivables.cardId,
      purchaseDate: schema.creditReceivables.purchaseDate,
      totalParcels: schema.creditReceivables.totalParcels,
      parcelValue: schema.creditReceivables.parcelValue,
      firstParcelDate: schema.creditReceivables.firstParcelDate,
      lastParcelDate: schema.creditReceivables.lastParcelDate,
      firstParcelMonth: schema.creditReceivables.firstParcelMonth,
      lastParcelMonth: schema.creditReceivables.lastParcelMonth,
      manualOverride: schema.creditReceivables.manualOverride,
      createdAt: schema.creditReceivables.createdAt,
      cardName: schema.cards.name,
      cardColor: schema.cards.color,
    })
    .from(schema.creditReceivables)
    .innerJoin(schema.cards, eq(schema.creditReceivables.cardId, schema.cards.id))
    .where(eq(schema.creditReceivables.userId, user.id))
    .orderBy(desc(schema.creditReceivables.purchaseDate), desc(schema.creditReceivables.createdAt));
}

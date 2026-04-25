import "server-only";

import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type CreditExpenseRow = typeof schema.creditExpenses.$inferSelect;

export type CreditExpenseWithDetails = CreditExpenseRow & {
  cardName: string;
  cardColor: string;
  subcategoryName: string;
  categoryName: string;
};

export async function listCreditExpenses(): Promise<CreditExpenseWithDetails[]> {
  const user = await requireUser();
  return db
    .select({
      id: schema.creditExpenses.id,
      userId: schema.creditExpenses.userId,
      description: schema.creditExpenses.description,
      cardId: schema.creditExpenses.cardId,
      subcategoryId: schema.creditExpenses.subcategoryId,
      purchaseDate: schema.creditExpenses.purchaseDate,
      totalParcels: schema.creditExpenses.totalParcels,
      parcelValue: schema.creditExpenses.parcelValue,
      firstParcelDate: schema.creditExpenses.firstParcelDate,
      lastParcelDate: schema.creditExpenses.lastParcelDate,
      firstParcelMonth: schema.creditExpenses.firstParcelMonth,
      lastParcelMonth: schema.creditExpenses.lastParcelMonth,
      manualOverride: schema.creditExpenses.manualOverride,
      originalSpreadsheetId: schema.creditExpenses.originalSpreadsheetId,
      createdAt: schema.creditExpenses.createdAt,
      cardName: schema.cards.name,
      cardColor: schema.cards.color,
      subcategoryName: schema.subcategories.name,
      categoryName: schema.categories.name,
    })
    .from(schema.creditExpenses)
    .innerJoin(schema.cards, eq(schema.creditExpenses.cardId, schema.cards.id))
    .innerJoin(
      schema.subcategories,
      eq(schema.creditExpenses.subcategoryId, schema.subcategories.id),
    )
    .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
    .where(eq(schema.creditExpenses.userId, user.id))
    .orderBy(desc(schema.creditExpenses.purchaseDate), desc(schema.creditExpenses.createdAt));
}

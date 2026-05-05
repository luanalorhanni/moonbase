import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type CreditExpenseRow = typeof schema.creditExpenses.$inferSelect;

export type CreditExpenseWithDetails = CreditExpenseRow & {
  cardName: string;
  cardColor: string;
  subcategoryName: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string;
};

export const listCreditExpenses = cachedQuery(
  "listCreditExpenses",
  [TAGS.creditExpenses],
  (userId): Promise<CreditExpenseWithDetails[]> =>
    db
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
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.creditExpenses)
      .innerJoin(schema.cards, eq(schema.creditExpenses.cardId, schema.cards.id))
      .innerJoin(
        schema.subcategories,
        eq(schema.creditExpenses.subcategoryId, schema.subcategories.id),
      )
      .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
      .where(eq(schema.creditExpenses.userId, userId))
      .orderBy(desc(schema.creditExpenses.createdAt)),
);

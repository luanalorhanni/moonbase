import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type CreditRefundRow = typeof schema.creditRefunds.$inferSelect;

/**
 * A refund with the card/subcategory/category inherited from its parent
 * credit_expense. Those are NOT stored on the refund (single source of truth):
 * they are joined in so the aggregation can net the refund out of the right
 * card and category buckets, and the UI can label it.
 */
export type CreditRefundWithDetails = CreditRefundRow & {
  expenseDescription: string;
  cardId: string;
  cardName: string;
  cardColor: string;
  subcategoryId: string;
  subcategoryName: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string;
};

export const listCreditRefunds = cachedQuery(
  "listCreditRefunds",
  [TAGS.creditRefunds],
  (userId): Promise<CreditRefundWithDetails[]> =>
    db
      .select({
        id: schema.creditRefunds.id,
        userId: schema.creditRefunds.userId,
        creditExpenseId: schema.creditRefunds.creditExpenseId,
        description: schema.creditRefunds.description,
        parcelValue: schema.creditRefunds.parcelValue,
        totalParcels: schema.creditRefunds.totalParcels,
        referenceMonth: schema.creditRefunds.referenceMonth,
        lastParcelMonth: schema.creditRefunds.lastParcelMonth,
        createdAt: schema.creditRefunds.createdAt,
        expenseDescription: schema.creditExpenses.description,
        cardId: schema.cards.id,
        cardName: schema.cards.name,
        cardColor: schema.cards.color,
        subcategoryId: schema.subcategories.id,
        subcategoryName: schema.subcategories.name,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.creditRefunds)
      .innerJoin(
        schema.creditExpenses,
        eq(schema.creditRefunds.creditExpenseId, schema.creditExpenses.id),
      )
      .innerJoin(schema.cards, eq(schema.creditExpenses.cardId, schema.cards.id))
      .innerJoin(
        schema.subcategories,
        eq(schema.creditExpenses.subcategoryId, schema.subcategories.id),
      )
      .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
      .where(eq(schema.creditRefunds.userId, userId))
      .orderBy(desc(schema.creditRefunds.createdAt)),
);

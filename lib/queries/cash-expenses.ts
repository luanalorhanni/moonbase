import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type CashExpenseRow = typeof schema.cashExpenses.$inferSelect;

export type CashExpenseWithDetails = CashExpenseRow & {
  cardName: string;
  subcategoryName: string;
  categoryName: string;
};

export const listCashExpenses = cachedQuery(
  "listCashExpenses",
  [TAGS.cashExpenses],
  (userId): Promise<CashExpenseWithDetails[]> =>
    db
      .select({
        id: schema.cashExpenses.id,
        userId: schema.cashExpenses.userId,
        description: schema.cashExpenses.description,
        cardId: schema.cashExpenses.cardId,
        method: schema.cashExpenses.method,
        subcategoryId: schema.cashExpenses.subcategoryId,
        date: schema.cashExpenses.date,
        amount: schema.cashExpenses.amount,
        originalSpreadsheetId: schema.cashExpenses.originalSpreadsheetId,
        createdAt: schema.cashExpenses.createdAt,
        cardName: schema.cards.name,
        subcategoryName: schema.subcategories.name,
        categoryName: schema.categories.name,
      })
      .from(schema.cashExpenses)
      .innerJoin(schema.cards, eq(schema.cashExpenses.cardId, schema.cards.id))
      .innerJoin(
        schema.subcategories,
        eq(schema.cashExpenses.subcategoryId, schema.subcategories.id),
      )
      .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
      .where(eq(schema.cashExpenses.userId, userId))
      .orderBy(desc(schema.cashExpenses.date), desc(schema.cashExpenses.createdAt)),
);

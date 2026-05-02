import "server-only";

import { desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type FixedExpenseRow = typeof schema.fixedExpenses.$inferSelect;

export type FixedExpenseWithDetails = FixedExpenseRow & {
  cardName: string;
  cardColor: string;
  subcategoryName: string;
  categoryName: string;
  categoryIcon: string | null;
  categoryColor: string;
};

export const listFixedExpenses = cachedQuery(
  "listFixedExpenses",
  [TAGS.fixedExpenses],
  (userId): Promise<FixedExpenseWithDetails[]> =>
    db
      .select({
        id: schema.fixedExpenses.id,
        userId: schema.fixedExpenses.userId,
        description: schema.fixedExpenses.description,
        cardId: schema.fixedExpenses.cardId,
        subcategoryId: schema.fixedExpenses.subcategoryId,
        paymentMethod: schema.fixedExpenses.paymentMethod,
        monthlyAmount: schema.fixedExpenses.monthlyAmount,
        dueDay: schema.fixedExpenses.dueDay,
        startDate: schema.fixedExpenses.startDate,
        endDate: schema.fixedExpenses.endDate,
        isActive: schema.fixedExpenses.isActive,
        createdAt: schema.fixedExpenses.createdAt,
        cardName: schema.cards.name,
        cardColor: schema.cards.color,
        subcategoryName: schema.subcategories.name,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
        categoryColor: schema.categories.color,
      })
      .from(schema.fixedExpenses)
      .innerJoin(schema.cards, eq(schema.fixedExpenses.cardId, schema.cards.id))
      .innerJoin(
        schema.subcategories,
        eq(schema.fixedExpenses.subcategoryId, schema.subcategories.id),
      )
      .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
      .where(eq(schema.fixedExpenses.userId, userId))
      .orderBy(desc(schema.fixedExpenses.isActive), desc(schema.fixedExpenses.startDate)),
);

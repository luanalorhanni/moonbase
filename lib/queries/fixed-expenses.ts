import "server-only";

import { desc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type FixedExpenseRow = typeof schema.fixedExpenses.$inferSelect;

export type FixedExpenseWithDetails = FixedExpenseRow & {
  cardName: string;
  cardColor: string;
  subcategoryName: string;
  categoryName: string;
};

export async function listFixedExpenses(): Promise<FixedExpenseWithDetails[]> {
  const user = await requireUser();
  return db
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
    })
    .from(schema.fixedExpenses)
    .innerJoin(schema.cards, eq(schema.fixedExpenses.cardId, schema.cards.id))
    .innerJoin(
      schema.subcategories,
      eq(schema.fixedExpenses.subcategoryId, schema.subcategories.id),
    )
    .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
    .where(eq(schema.fixedExpenses.userId, user.id))
    .orderBy(desc(schema.fixedExpenses.isActive), desc(schema.fixedExpenses.startDate));
}

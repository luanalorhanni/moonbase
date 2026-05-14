import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type MonthlyBudgetRow = typeof schema.monthlyBudgets.$inferSelect;
export type MonthlyCategoryBudgetRow = typeof schema.monthlyCategoryBudgets.$inferSelect;

export type MonthBudget = {
  budget: MonthlyBudgetRow | null;
  categoryBudgets: MonthlyCategoryBudgetRow[];
};

export const loadMonthBudget = cache(_loadMonthBudget);

async function _loadMonthBudget(referenceMonth: string): Promise<MonthBudget> {
  const user = await requireUser();
  const refDay1 = `${referenceMonth}-01`;

  const [budgetRows, catRows] = await Promise.all([
    db
      .select()
      .from(schema.monthlyBudgets)
      .where(
        and(
          eq(schema.monthlyBudgets.userId, user.id),
          eq(schema.monthlyBudgets.referenceMonth, refDay1),
        ),
      )
      .limit(1),
    db
      .select()
      .from(schema.monthlyCategoryBudgets)
      .where(
        and(
          eq(schema.monthlyCategoryBudgets.userId, user.id),
          eq(schema.monthlyCategoryBudgets.referenceMonth, refDay1),
        ),
      ),
  ]);

  return { budget: budgetRows[0] ?? null, categoryBudgets: catRows };
}

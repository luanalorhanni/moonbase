"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { monthlyBudgetFormSchema } from "@/lib/validation/monthly-budget";

export type BudgetActionResult = { ok: true } | { ok: false; error: string };

export async function saveMonthlyBudget(
  referenceMonth: string,
  raw: unknown,
): Promise<BudgetActionResult> {
  const user = await requireUser();

  if (!/^\d{4}-\d{2}$/.test(referenceMonth)) {
    return { ok: false, error: "invalid month format." };
  }

  const parsed = monthlyBudgetFormSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "invalid input." };
  }

  const { maxTotal, maxCredit, maxCash, categories } = parsed.data;
  const refDay1 = `${referenceMonth}-01`;

  const hasMainBudget = maxTotal !== "" || maxCredit !== "" || maxCash !== "";

  // ── monthly_budgets row ──────────────────────────────────────────────
  if (hasMainBudget) {
    // Delete existing row, then insert fresh (simpler than ON CONFLICT DO UPDATE).
    await db
      .delete(schema.monthlyBudgets)
      .where(
        and(
          eq(schema.monthlyBudgets.userId, user.id),
          eq(schema.monthlyBudgets.referenceMonth, refDay1),
        ),
      );
    await db.insert(schema.monthlyBudgets).values({
      userId: user.id,
      referenceMonth: refDay1,
      maxCredit: maxCredit !== "" ? maxCredit : null,
      maxCash: maxCash !== "" ? maxCash : null,
      maxTotal: maxTotal !== "" ? maxTotal : null,
    });
  } else {
    // All fields cleared — remove the row if it exists.
    await db
      .delete(schema.monthlyBudgets)
      .where(
        and(
          eq(schema.monthlyBudgets.userId, user.id),
          eq(schema.monthlyBudgets.referenceMonth, refDay1),
        ),
      );
  }

  // ── monthly_category_budgets rows ────────────────────────────────────
  const toSave = categories.filter((c) => c.maxAmount !== "");
  const toClear = categories.filter((c) => c.maxAmount === "").map((c) => c.categoryId);

  if (toClear.length > 0) {
    await db
      .delete(schema.monthlyCategoryBudgets)
      .where(
        and(
          eq(schema.monthlyCategoryBudgets.userId, user.id),
          eq(schema.monthlyCategoryBudgets.referenceMonth, refDay1),
          inArray(schema.monthlyCategoryBudgets.categoryId, toClear),
        ),
      );
  }

  if (toSave.length > 0) {
    // Delete-then-insert to handle updates cleanly.
    await db.delete(schema.monthlyCategoryBudgets).where(
      and(
        eq(schema.monthlyCategoryBudgets.userId, user.id),
        eq(schema.monthlyCategoryBudgets.referenceMonth, refDay1),
        inArray(
          schema.monthlyCategoryBudgets.categoryId,
          toSave.map((c) => c.categoryId),
        ),
      ),
    );
    await db.insert(schema.monthlyCategoryBudgets).values(
      toSave.map((c) => ({
        userId: user.id,
        referenceMonth: refDay1,
        categoryId: c.categoryId,
        maxAmount: c.maxAmount,
      })),
    );
  }

  invalidate(TAGS.monthlyBudgets);
  revalidatePath(`/month/${referenceMonth}`);
  revalidatePath("/");

  return { ok: true };
}

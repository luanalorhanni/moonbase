import "server-only";

import { and, asc, desc, eq, gte, lte } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type HabitRow = typeof schema.habits.$inferSelect;
export type HabitCategoryRow = typeof schema.habitCategories.$inferSelect;
export type HabitLogRow = typeof schema.habitLogs.$inferSelect;

export type HabitWithCategory = HabitRow & {
  categoryName: string | null;
  categoryColor: string | null;
  categoryIcon: string | null;
};

export const listHabitCategories = cachedQuery(
  "listHabitCategories",
  [TAGS.habitCategories],
  (userId): Promise<HabitCategoryRow[]> =>
    db
      .select()
      .from(schema.habitCategories)
      .where(eq(schema.habitCategories.userId, userId))
      .orderBy(asc(schema.habitCategories.name)),
);

export const listHabits = cachedQuery(
  "listHabits",
  [TAGS.habits, TAGS.habitCategories],
  (userId): Promise<HabitWithCategory[]> =>
    db
      .select({
        id: schema.habits.id,
        userId: schema.habits.userId,
        name: schema.habits.name,
        description: schema.habits.description,
        categoryId: schema.habits.categoryId,
        polarity: schema.habits.polarity,
        schedule: schema.habits.schedule,
        targetPerWeek: schema.habits.targetPerWeek,
        color: schema.habits.color,
        icon: schema.habits.icon,
        isActive: schema.habits.isActive,
        createdAt: schema.habits.createdAt,
        categoryName: schema.habitCategories.name,
        categoryColor: schema.habitCategories.color,
        categoryIcon: schema.habitCategories.icon,
      })
      .from(schema.habits)
      .leftJoin(
        schema.habitCategories,
        eq(schema.habits.categoryId, schema.habitCategories.id),
      )
      .where(eq(schema.habits.userId, userId))
      .orderBy(desc(schema.habits.isActive), asc(schema.habits.name)),
);

/**
 * Logs within a date window (yyyy-mm-dd inclusive). Date-range queries
 * don't compose well with `unstable_cache` (each window would be a fresh
 * cache key), so we hit the DB directly. The route-level fetch cache
 * still amortises across components on the same render.
 */
export async function listHabitLogsBetween(
  fromIso: string,
  toIso: string,
): Promise<HabitLogRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.habitLogs)
    .where(
      and(
        eq(schema.habitLogs.userId, user.id),
        gte(schema.habitLogs.date, fromIso),
        lte(schema.habitLogs.date, toIso),
      ),
    )
    .orderBy(desc(schema.habitLogs.date));
}

/** All logs for a single habit (used on the detail page later). */
export async function listLogsForHabit(habitId: string): Promise<HabitLogRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.habitLogs)
    .where(and(eq(schema.habitLogs.habitId, habitId), eq(schema.habitLogs.userId, user.id)))
    .orderBy(desc(schema.habitLogs.date));
}

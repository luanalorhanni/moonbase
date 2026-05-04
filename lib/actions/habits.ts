"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import {
  habitCategoryFormSchema,
  habitFormSchema,
  normaliseHabitForm,
  type HabitCategoryFormInput,
  type HabitFormInput,
} from "@/lib/validation/habit";

export type HabitActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> };

function flattenIssues(error: import("zod").ZodError) {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (!fieldErrors[key]) fieldErrors[key] = [];
    fieldErrors[key].push(issue.message);
  }
  return fieldErrors;
}

function bustHabitsAndPath() {
  invalidate(TAGS.habits, TAGS.habitCategories, TAGS.habitLogs);
  revalidatePath("/habits");
  revalidatePath("/habits/categories");
}

/* ─── habits ────────────────────────────────────────────────────── */

export async function createHabit(input: HabitFormInput): Promise<HabitActionResult> {
  const user = await requireUser();
  const parsed = habitFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseHabitForm(parsed.data);
  await db.insert(schema.habits).values({ userId: user.id, ...data });
  bustHabitsAndPath();
  return { ok: true };
}

export async function updateHabit(id: string, input: HabitFormInput): Promise<HabitActionResult> {
  const user = await requireUser();
  const parsed = habitFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseHabitForm(parsed.data);
  await db
    .update(schema.habits)
    .set(data)
    .where(and(eq(schema.habits.id, id), eq(schema.habits.userId, user.id)));
  bustHabitsAndPath();
  return { ok: true };
}

export async function deleteHabit(id: string): Promise<HabitActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.habits)
    .where(and(eq(schema.habits.id, id), eq(schema.habits.userId, user.id)));
  bustHabitsAndPath();
  return { ok: true };
}

/* ─── habit categories ────────────────────────────────────────────── */

export async function createHabitCategory(
  input: HabitCategoryFormInput,
): Promise<HabitActionResult> {
  const user = await requireUser();
  const parsed = habitCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  await db.insert(schema.habitCategories).values({
    userId: user.id,
    name: parsed.data.name.trim(),
    color: parsed.data.color.toLowerCase(),
    icon: parsed.data.icon.trim() === "" ? null : parsed.data.icon.trim(),
  });
  bustHabitsAndPath();
  return { ok: true };
}

export async function updateHabitCategory(
  id: string,
  input: HabitCategoryFormInput,
): Promise<HabitActionResult> {
  const user = await requireUser();
  const parsed = habitCategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "please check the form fields.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  await db
    .update(schema.habitCategories)
    .set({
      name: parsed.data.name.trim(),
      color: parsed.data.color.toLowerCase(),
      icon: parsed.data.icon.trim() === "" ? null : parsed.data.icon.trim(),
    })
    .where(and(eq(schema.habitCategories.id, id), eq(schema.habitCategories.userId, user.id)));
  bustHabitsAndPath();
  return { ok: true };
}

export async function deleteHabitCategory(id: string): Promise<HabitActionResult> {
  const user = await requireUser();
  await db
    .delete(schema.habitCategories)
    .where(and(eq(schema.habitCategories.id, id), eq(schema.habitCategories.userId, user.id)));
  bustHabitsAndPath();
  return { ok: true };
}

/* ─── habit logs ──────────────────────────────────────────────────── */

/**
 * Toggle the success state for a habit on a date. Idempotent — pass `done=true`
 * to ensure a row exists, `done=false` to ensure it's gone. Presence of a
 * row means the user succeeded that day (did the thing for `do` polarity,
 * stayed clean for `avoid`).
 */
export async function setHabitLog(
  habitId: string,
  dateIso: string,
  done: boolean,
): Promise<HabitActionResult> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) {
    return { ok: false, error: "invalid date." };
  }

  if (done) {
    await db
      .insert(schema.habitLogs)
      .values({ userId: user.id, habitId, date: dateIso })
      .onConflictDoNothing();
  } else {
    await db
      .delete(schema.habitLogs)
      .where(
        and(
          eq(schema.habitLogs.userId, user.id),
          eq(schema.habitLogs.habitId, habitId),
          eq(schema.habitLogs.date, dateIso),
        ),
      );
  }

  invalidate(TAGS.habitLogs);
  revalidatePath("/habits");
  return { ok: true };
}

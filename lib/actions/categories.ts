"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { invalidateCategoryGraph, invalidateSubcategoryGraph } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import {
  categoryFormSchema,
  normaliseCategoryForm,
  subcategoryFormSchema,
  type CategoryFormInput,
  type SubcategoryFormInput,
} from "@/lib/validation/category";

export type CategoryActionResult =
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

export async function createCategory(input: CategoryFormInput): Promise<CategoryActionResult> {
  const user = await requireUser();
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCategoryForm(parsed.data);
  await db.insert(schema.categories).values({ userId: user.id, ...data });
  invalidateCategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateCategory(
  id: string,
  input: CategoryFormInput,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const parsed = categoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  const data = normaliseCategoryForm(parsed.data);
  await db
    .update(schema.categories)
    .set(data)
    .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)));
  invalidateCategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteCategory(id: string): Promise<CategoryActionResult> {
  const user = await requireUser();
  try {
    await db
      .delete(schema.categories)
      .where(and(eq(schema.categories.id, id), eq(schema.categories.userId, user.id)));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23503"
    ) {
      return {
        ok: false,
        error: "Esta categoria tem despesas associadas e não pode ser excluída.",
      };
    }
    throw error;
  }
  invalidateCategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

export async function createSubcategory(
  input: SubcategoryFormInput,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const parsed = subcategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  await db.insert(schema.subcategories).values({
    userId: user.id,
    name: parsed.data.name.trim(),
    categoryId: parsed.data.categoryId,
  });
  invalidateSubcategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

export async function updateSubcategory(
  id: string,
  input: SubcategoryFormInput,
): Promise<CategoryActionResult> {
  const user = await requireUser();
  const parsed = subcategoryFormSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "Verifique os campos do formulário.",
      fieldErrors: flattenIssues(parsed.error),
    };
  }
  await db
    .update(schema.subcategories)
    .set({ name: parsed.data.name.trim(), categoryId: parsed.data.categoryId })
    .where(and(eq(schema.subcategories.id, id), eq(schema.subcategories.userId, user.id)));
  invalidateSubcategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

export async function deleteSubcategory(id: string): Promise<CategoryActionResult> {
  const user = await requireUser();
  try {
    await db
      .delete(schema.subcategories)
      .where(and(eq(schema.subcategories.id, id), eq(schema.subcategories.userId, user.id)));
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "23503"
    ) {
      return {
        ok: false,
        error: "Esta subcategoria tem despesas associadas e não pode ser excluída.",
      };
    }
    throw error;
  }
  invalidateSubcategoryGraph();
  revalidatePath("/categories");
  return { ok: true };
}

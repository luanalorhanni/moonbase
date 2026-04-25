import "server-only";

import { asc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

export type CategoryRow = typeof schema.categories.$inferSelect;
export type SubcategoryRow = typeof schema.subcategories.$inferSelect;
export type CategoryWithSubs = CategoryRow & { subcategories: SubcategoryRow[] };

export async function listCategoriesWithSubs(): Promise<CategoryWithSubs[]> {
  const user = await requireUser();

  const [cats, subs] = await Promise.all([
    db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, user.id))
      .orderBy(asc(schema.categories.name)),
    db
      .select()
      .from(schema.subcategories)
      .where(eq(schema.subcategories.userId, user.id))
      .orderBy(asc(schema.subcategories.name)),
  ]);

  return cats.map((cat) => ({
    ...cat,
    subcategories: subs.filter((s) => s.categoryId === cat.id),
  }));
}

export async function listCategories(): Promise<CategoryRow[]> {
  const user = await requireUser();
  return db
    .select()
    .from(schema.categories)
    .where(eq(schema.categories.userId, user.id))
    .orderBy(asc(schema.categories.name));
}

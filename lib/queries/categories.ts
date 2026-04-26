import "server-only";

import { asc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type CategoryRow = typeof schema.categories.$inferSelect;
export type SubcategoryRow = typeof schema.subcategories.$inferSelect;
export type CategoryWithSubs = CategoryRow & { subcategories: SubcategoryRow[] };

export const listCategoriesWithSubs = cachedQuery(
  "listCategoriesWithSubs",
  [TAGS.categories, TAGS.subcategories],
  async (userId): Promise<CategoryWithSubs[]> => {
    const [cats, subs] = await Promise.all([
      db
        .select()
        .from(schema.categories)
        .where(eq(schema.categories.userId, userId))
        .orderBy(asc(schema.categories.name)),
      db
        .select()
        .from(schema.subcategories)
        .where(eq(schema.subcategories.userId, userId))
        .orderBy(asc(schema.subcategories.name)),
    ]);

    return cats.map((cat) => ({
      ...cat,
      subcategories: subs.filter((s) => s.categoryId === cat.id),
    }));
  },
);

export const listCategories = cachedQuery(
  "listCategories",
  [TAGS.categories],
  (userId): Promise<CategoryRow[]> =>
    db
      .select()
      .from(schema.categories)
      .where(eq(schema.categories.userId, userId))
      .orderBy(asc(schema.categories.name)),
);

export type SubcategoryWithCategory = SubcategoryRow & {
  categoryName: string;
  categoryIcon: string | null;
};

export const listSubcategoriesWithCategory = cachedQuery(
  "listSubcategoriesWithCategory",
  [TAGS.subcategories, TAGS.categories],
  (userId): Promise<SubcategoryWithCategory[]> =>
    db
      .select({
        id: schema.subcategories.id,
        userId: schema.subcategories.userId,
        name: schema.subcategories.name,
        categoryId: schema.subcategories.categoryId,
        createdAt: schema.subcategories.createdAt,
        categoryName: schema.categories.name,
        categoryIcon: schema.categories.icon,
      })
      .from(schema.subcategories)
      .innerJoin(schema.categories, eq(schema.subcategories.categoryId, schema.categories.id))
      .where(eq(schema.subcategories.userId, userId))
      .orderBy(asc(schema.categories.name), asc(schema.subcategories.name)),
);

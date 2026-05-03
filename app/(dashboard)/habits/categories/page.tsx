import { listHabitCategories, listHabits } from "@/lib/queries/habits";

import { HabitCategoriesList } from "./categories-list";

export const metadata = {
  title: "Categorias de hábitos — moonbase",
};

export default async function HabitCategoriesPage() {
  const [categories, habits] = await Promise.all([listHabitCategories(), listHabits()]);
  // Map of categoryId → number of habits using it (for display + delete-guard hint).
  const counts = new Map<string, number>();
  for (const h of habits) {
    if (!h.categoryId) continue;
    counts.set(h.categoryId, (counts.get(h.categoryId) ?? 0) + 1);
  }
  const enriched = categories.map((c) => ({ ...c, habitCount: counts.get(c.id) ?? 0 }));
  return <HabitCategoriesList initialCategories={enriched} />;
}

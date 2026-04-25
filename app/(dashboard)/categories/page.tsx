import { listCategoriesWithSubs } from "@/lib/queries/categories";

import { CategoriesList } from "./categories-list";

export const metadata = {
  title: "Categorias — moonbase",
};

export default async function CategoriesPage() {
  const categories = await listCategoriesWithSubs();
  return <CategoriesList initialCategories={categories} />;
}

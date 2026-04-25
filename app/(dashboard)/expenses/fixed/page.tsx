import { listCards } from "@/lib/queries/cards";
import { listSubcategoriesWithCategory } from "@/lib/queries/categories";
import { listFixedExpenses } from "@/lib/queries/fixed-expenses";

import { FixedExpensesList } from "./fixed-expenses-list";

export const metadata = {
  title: "Despesas fixas — moonbase",
};

export default async function FixedExpensesPage() {
  const [expenses, cards, subcategories] = await Promise.all([
    listFixedExpenses(),
    listCards(),
    listSubcategoriesWithCategory(),
  ]);

  return (
    <FixedExpensesList initialExpenses={expenses} cards={cards} subcategories={subcategories} />
  );
}

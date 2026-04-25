import { listCards } from "@/lib/queries/cards";
import { listCashExpenses } from "@/lib/queries/cash-expenses";
import { listSubcategoriesWithCategory } from "@/lib/queries/categories";

import { CashExpensesList } from "./cash-expenses-list";

export const metadata = {
  title: "Despesas à vista — moonbase",
};

export default async function CashExpensesPage() {
  const [expenses, cards, subcategories] = await Promise.all([
    listCashExpenses(),
    listCards(),
    listSubcategoriesWithCategory(),
  ]);

  return (
    <CashExpensesList initialExpenses={expenses} cards={cards} subcategories={subcategories} />
  );
}

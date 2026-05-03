import { listCards } from "@/lib/queries/cards";
import { listCashExpenses } from "@/lib/queries/cash-expenses";
import { listSubcategoriesWithCategory } from "@/lib/queries/categories";
import { listLiquidSavings } from "@/lib/queries/investments";

import { CashExpensesList } from "./cash-expenses-list";

export const metadata = {
  title: "Despesas à vista — moonbase",
};

export default async function CashExpensesPage() {
  const [expenses, cards, subcategories, liquidSavings] = await Promise.all([
    listCashExpenses(),
    listCards(),
    listSubcategoriesWithCategory(),
    listLiquidSavings(),
  ]);

  return (
    <CashExpensesList
      initialExpenses={expenses}
      cards={cards}
      subcategories={subcategories}
      liquidSavings={liquidSavings}
    />
  );
}

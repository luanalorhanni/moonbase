import { listCards } from "@/lib/queries/cards";
import { listSubcategoriesWithCategory } from "@/lib/queries/categories";
import { listCreditExpenses } from "@/lib/queries/credit-expenses";

import { CreditExpensesList } from "./credit-expenses-list";

export const metadata = {
  title: "Despesas de crédito — moonbase",
};

export default async function CreditExpensesPage() {
  const [expenses, cards, subcategories] = await Promise.all([
    listCreditExpenses(),
    listCards(),
    listSubcategoriesWithCategory(),
  ]);

  return (
    <CreditExpensesList initialExpenses={expenses} cards={cards} subcategories={subcategories} />
  );
}

import { listCards } from "@/lib/queries/cards";
import { listSubcategoriesWithCategory } from "@/lib/queries/categories";
import { listCreditExpenses } from "@/lib/queries/credit-expenses";
import { listCreditRefunds } from "@/lib/queries/credit-refunds";

import { CreditExpensesList } from "./credit-expenses-list";

export const metadata = {
  title: "Credit expenses — moonbase",
};

export default async function CreditExpensesPage() {
  const [expenses, refunds, cards, subcategories] = await Promise.all([
    listCreditExpenses(),
    listCreditRefunds(),
    listCards(),
    listSubcategoriesWithCategory(),
  ]);

  return (
    <CreditExpensesList
      initialExpenses={expenses}
      refunds={refunds}
      cards={cards}
      subcategories={subcategories}
    />
  );
}

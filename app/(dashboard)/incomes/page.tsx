import { listIncomes } from "@/lib/queries/incomes";

import { IncomesList } from "./incomes-list";

export const metadata = {
  title: "Receitas — moonbase",
};

export default async function IncomesPage() {
  const incomes = await listIncomes();
  return <IncomesList initialIncomes={incomes} />;
}

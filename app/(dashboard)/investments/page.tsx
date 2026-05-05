import { listCards } from "@/lib/queries/cards";
import { listInvestmentUpdates } from "@/lib/queries/investment-updates";
import { listFixedIncome, listLiquidSavings } from "@/lib/queries/investments";

import { InvestmentsPage } from "./investments-page";

export const metadata = {
  title: "Investimentos — moonbase",
};

export default async function InvestmentsRoute() {
  const [liquidSavings, fixedIncome, updates, cards] = await Promise.all([
    listLiquidSavings(),
    listFixedIncome(),
    listInvestmentUpdates(),
    listCards(),
  ]);

  return (
    <InvestmentsPage
      liquidSavings={liquidSavings}
      fixedIncome={fixedIncome}
      updates={updates}
      cards={cards}
    />
  );
}

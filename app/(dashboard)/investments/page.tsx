import { listInvestmentUpdates } from "@/lib/queries/investment-updates";
import { listFixedIncome, listLiquidSavings } from "@/lib/queries/investments";

import { InvestmentsPage } from "./investments-page";

export const metadata = {
  title: "Investimentos — moonbase",
};

export default async function InvestmentsRoute() {
  const [liquidSavings, fixedIncome, updates] = await Promise.all([
    listLiquidSavings(),
    listFixedIncome(),
    listInvestmentUpdates(),
  ]);

  return (
    <InvestmentsPage
      liquidSavings={liquidSavings}
      fixedIncome={fixedIncome}
      updates={updates}
    />
  );
}

import { listFixedIncome, listLiquidSavings } from "@/lib/queries/investments";

import { InvestmentsPage } from "./investments-page";

export const metadata = {
  title: "Investimentos — moonbase",
};

export default async function InvestmentsRoute() {
  const [liquidSavings, fixedIncome] = await Promise.all([listLiquidSavings(), listFixedIncome()]);

  return <InvestmentsPage liquidSavings={liquidSavings} fixedIncome={fixedIncome} />;
}

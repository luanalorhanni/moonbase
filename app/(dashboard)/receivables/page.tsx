import { listCards } from "@/lib/queries/cards";
import { listCashReceivables, listCreditReceivables } from "@/lib/queries/receivables";

import { ReceivablesPage } from "./receivables-page";

export const metadata = {
  title: "Recebíveis — moonbase",
};

export default async function ReceivablesRoute() {
  const [cashReceivables, creditReceivables, cards] = await Promise.all([
    listCashReceivables(),
    listCreditReceivables(),
    listCards(),
  ]);

  return (
    <ReceivablesPage
      cashReceivables={cashReceivables}
      creditReceivables={creditReceivables}
      cards={cards}
    />
  );
}

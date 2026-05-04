import { listCards } from "@/lib/queries/cards";
import {
  listCashReceivables,
  listCreditReceivables,
  listPaidCreditParcels,
} from "@/lib/queries/receivables";

import { ReceivablesPage } from "./receivables-page";

export const metadata = {
  title: "Receivables — moonbase",
};

export default async function ReceivablesRoute() {
  const [cashReceivables, creditReceivables, paidParcels, cards] = await Promise.all([
    listCashReceivables(),
    listCreditReceivables(),
    listPaidCreditParcels(),
    listCards(),
  ]);

  return (
    <ReceivablesPage
      cashReceivables={cashReceivables}
      creditReceivables={creditReceivables}
      paidParcels={paidParcels.map((p) => ({
        receivableId: p.receivableId,
        parcelNumber: p.parcelNumber,
      }))}
      cards={cards}
    />
  );
}

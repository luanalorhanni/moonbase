import { redirect } from "next/navigation";

import { currentMonthRef, isMonthRef } from "@/lib/finance/month";
import { loadMonth } from "@/lib/queries/month";

import { MonthView } from "./month-view";

type Params = { reference: string };

export default async function MonthPage({ params }: { params: Promise<Params> }) {
  const { reference } = await params;

  if (!isMonthRef(reference)) {
    redirect(`/month/${currentMonthRef()}`);
  }

  const summary = await loadMonth(reference);
  return <MonthView summary={summary} />;
}

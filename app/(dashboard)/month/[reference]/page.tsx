import { Suspense } from "react";
import { redirect } from "next/navigation";

import { MonthDashboard } from "@/components/dashboard/month-dashboard";
import { currentMonthRef, isMonthRef } from "@/lib/finance/month";
import MonthLoading from "./loading";

type Params = { reference: string };

export default async function MonthPage({ params }: { params: Promise<Params> }) {
  const { reference } = await params;
  if (!isMonthRef(reference)) {
    redirect(`/month/${currentMonthRef()}`);
  }
  return (
    <Suspense key={reference} fallback={<MonthLoading />}>
      <MonthDashboard reference={reference} />
    </Suspense>
  );
}

import { redirect } from "next/navigation";

import { MonthDashboard } from "@/components/dashboard/month-dashboard";
import { currentMonthRef, isMonthRef } from "@/lib/finance/month";

type Params = { reference: string };

export default async function MonthPage({ params }: { params: Promise<Params> }) {
  const { reference } = await params;
  if (!isMonthRef(reference)) {
    redirect(`/month/${currentMonthRef()}`);
  }
  return <MonthDashboard reference={reference} />;
}

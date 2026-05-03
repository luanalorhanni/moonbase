import { MonthDashboard } from "@/components/dashboard/month-dashboard";
import { currentMonthRef } from "@/lib/finance/month";

export const metadata = {
  title: "Mês — moonbase",
};

export default function MonthIndex() {
  return <MonthDashboard reference={currentMonthRef()} />;
}

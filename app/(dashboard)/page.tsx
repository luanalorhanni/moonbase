import { MonthDashboard } from "@/components/dashboard/month-dashboard";
import { currentMonthRef } from "@/lib/finance/month";

export default function HomePage() {
  return <MonthDashboard reference={currentMonthRef()} />;
}

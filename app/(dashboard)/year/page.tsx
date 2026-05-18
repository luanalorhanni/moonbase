import { redirect } from "next/navigation";

import { todayBrazil } from "@/lib/utils";

/**
 * `/year` is a sidebar shortcut — redirect to the current calendar year so
 * the user lands on a populated ledger instead of a placeholder.
 */
export default function YearIndex() {
  redirect(`/year/${todayBrazil().slice(0, 4)}`);
}

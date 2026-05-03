import { listHabitCategories, listHabitLogsBetween, listHabits } from "@/lib/queries/habits";

import { HabitsPage } from "./habits-page";

export const metadata = {
  title: "Hábitos — moonbase",
};

function todayIso(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

export default async function HabitsRoute() {
  const today = todayIso();
  // Load ~13 months of logs so the monthly heatmap can navigate roughly
  // a year back without refetching, and streaks/weekly progress have
  // plenty of headroom too.
  const fromDate = shiftDays(today, -400);
  const [habits, categories, recentLogs] = await Promise.all([
    listHabits(),
    listHabitCategories(),
    listHabitLogsBetween(fromDate, today),
  ]);

  return (
    <HabitsPage
      habits={habits}
      categories={categories}
      recentLogs={recentLogs}
      todayIso={today}
    />
  );
}

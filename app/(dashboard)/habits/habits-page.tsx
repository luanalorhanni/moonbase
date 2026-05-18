"use client";

import { Check, CircleCheckBig, Flame, MoreHorizontal, Plus, ShieldOff, Tag } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { MonthlyHabitHeatmap } from "@/components/charts/monthly-habit-heatmap";
import { WeeklyHabitsChart } from "@/components/charts/weekly-habits-chart";
import { LogReminder } from "@/components/dashboard/log-reminder";
import { PageShell } from "@/components/dashboard/page-shell";
import { PixelStarSmall } from "@/components/decorative/pixel-icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { deleteHabit, setHabitLog } from "@/lib/actions/habits";
import type { HabitCategoryRow, HabitLogRow, HabitWithCategory } from "@/lib/queries/habits";
import { cn } from "@/lib/utils";

import { DayEditorDialog } from "./day-editor-dialog";
import { HabitForm } from "./habit-form";

type DialogState =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; habit: HabitWithCategory };

type Props = {
  habits: HabitWithCategory[];
  categories: HabitCategoryRow[];
  recentLogs: HabitLogRow[];
  todayIso: string;
};

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

/** Monday-anchored week start for the given iso date. */
function weekStart(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  // getDay: 0=Sun..6=Sat. Brazilian convention starts Monday — shift by
  // (day - 1 + 7) % 7 to land on Monday.
  const diff = (date.getDay() - 1 + 7) % 7;
  date.setDate(date.getDate() - diff);
  const ny = date.getFullYear();
  const nm = String(date.getMonth() + 1).padStart(2, "0");
  const nd = String(date.getDate()).padStart(2, "0");
  return `${ny}-${nm}-${nd}`;
}

function computeStreak(dates: Set<string>, todayIso: string): number {
  let streak = 0;
  let cursor = todayIso;
  // Allow grace: if today not yet logged, start from yesterday (so the user
  // doesn't see the streak break before they've checked off today).
  if (!dates.has(cursor)) cursor = shiftDays(cursor, -1);
  while (dates.has(cursor)) {
    streak += 1;
    cursor = shiftDays(cursor, -1);
  }
  return streak;
}

function computeWeekProgress(dates: Set<string>, todayIso: string): number {
  const start = weekStart(todayIso);
  let count = 0;
  for (let i = 0; i < 7; i++) {
    if (dates.has(shiftDays(start, i))) count += 1;
  }
  return count;
}

export function HabitsPage({ habits, categories, recentLogs, todayIso }: Props) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogState>({ kind: "closed" });
  const [editingDate, setEditingDate] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<HabitWithCategory | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isToggling, startToggleTransition] = useTransition();
  const [optimistic, setOptimistic] = useState<Set<string>>(() => new Set());

  // Index logs by habit for O(1) "did the user log this?" lookups.
  const logsByHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const log of recentLogs) {
      const dates = map.get(log.habitId);
      if (dates) dates.add(log.date);
      else map.set(log.habitId, new Set([log.date]));
    }
    return map;
  }, [recentLogs]);

  // Most recent date with any habit logged. Drives the reminder banner.
  const lastLogDate = useMemo(() => {
    let latest: string | null = null;
    for (const log of recentLogs) {
      if (!latest || log.date > latest) latest = log.date;
    }
    return latest;
  }, [recentLogs]);

  function isDoneToday(habitId: string): boolean {
    const k = `${habitId}|${todayIso}`;
    if (optimistic.has(`+${k}`)) return true;
    if (optimistic.has(`-${k}`)) return false;
    return logsByHabit.get(habitId)?.has(todayIso) ?? false;
  }

  const activeHabits = useMemo(() => habits.filter((h) => h.isActive), [habits]);
  const inactiveHabits = useMemo(() => habits.filter((h) => !h.isActive), [habits]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    const doneToday = activeHabits.filter((h) => isDoneToday(h.id)).length;
    let longestStreak = 0;
    let weeklyDone = 0;
    let weeklyTarget = 0;
    for (const h of activeHabits) {
      const dates = logsByHabit.get(h.id) ?? new Set<string>();
      // include optimistic toggles in streak/weekly maths
      const adjusted = new Set(dates);
      const k = `${h.id}|${todayIso}`;
      if (optimistic.has(`+${k}`)) adjusted.add(todayIso);
      if (optimistic.has(`-${k}`)) adjusted.delete(todayIso);

      if (h.schedule === "daily") {
        longestStreak = Math.max(longestStreak, computeStreak(adjusted, todayIso));
      } else if (h.schedule === "weekly_target") {
        weeklyDone += computeWeekProgress(adjusted, todayIso);
        weeklyTarget += h.targetPerWeek ?? 0;
      }
    }
    return {
      activeCount: activeHabits.length,
      doneToday,
      longestStreak,
      weeklyDone,
      weeklyTarget,
    };
  }, [activeHabits, logsByHabit, optimistic, todayIso]);

  function toggleToday(habit: HabitWithCategory) {
    const currentlyDone = isDoneToday(habit.id);
    const next = !currentlyDone;
    const k = `${habit.id}|${todayIso}`;

    // Optimistic update — flip immediately, undo on failure.
    setOptimistic((prev) => {
      const n = new Set(prev);
      n.delete(`+${k}`);
      n.delete(`-${k}`);
      n.add(next ? `+${k}` : `-${k}`);
      return n;
    });

    startToggleTransition(async () => {
      const result = await setHabitLog(habit.id, todayIso, next);
      if (result.ok) {
        // Once the server confirms, re-fetch the page; the new server data
        // supersedes our optimistic flag.
        setOptimistic((prev) => {
          const n = new Set(prev);
          n.delete(`+${k}`);
          n.delete(`-${k}`);
          return n;
        });
        router.refresh();
      } else {
        // Roll back.
        setOptimistic((prev) => {
          const n = new Set(prev);
          n.delete(`+${k}`);
          n.delete(`-${k}`);
          return n;
        });
        toast.error(result.error);
      }
    });
  }

  function handleDelete(habit: HabitWithCategory) {
    startDeleteTransition(async () => {
      const result = await deleteHabit(habit.id);
      if (result.ok) {
        toast.success("habit removed.");
        setPendingDelete(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="habits"
      subtitle="daily and weekly routines"
      toolbar={
        <div className="flex items-center gap-2">
          <Link
            href="/habits/categories"
            className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12.5px] transition-colors"
          >
            <Tag aria-hidden className="size-3.5" strokeWidth={1.6} />
            categories
          </Link>
          <Button onClick={() => setDialog({ kind: "create" })} size="sm">
            <Plus aria-hidden className="size-3.5" /> new habit
          </Button>
        </div>
      }
    >
      {/* ── editorial hero + monthly heatmap ──────────────────────── */}
      {habits.length > 0 && (
        <section className="border-border relative isolate overflow-hidden border-b">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 -z-10 opacity-80"
            style={{
              background:
                "radial-gradient(circle at 0% 0%, oklch(0.65 0.10 200 / 0.10), transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.65 0.06 325 / 0.08), transparent 55%)",
            }}
          />
          <div className="grid grid-cols-1 gap-5 px-6 py-6 md:py-7 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-stretch lg:gap-6">
            {/* left column: editorial title + heatmap stacked */}
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground/80 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.32em] uppercase">
                  <PixelStarSmall size={5} className="text-primary" />
                  daily routine
                </span>
                <h2 className="font-display text-foreground flex flex-wrap items-baseline gap-3 leading-none tracking-[-0.03em]">
                  <span className="text-[44px] font-light italic md:text-[60px]">
                    {todayWeekdayLong(todayIso)}
                  </span>
                  <span className="text-muted-foreground/70 font-display text-[22px] font-light italic md:text-[28px]">
                    {todayDateLong(todayIso)}
                  </span>
                </h2>
                <span className="text-muted-foreground/80 mt-1 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                  click any heatmap cell to edit a day
                </span>
              </div>

              <MonthlyHabitHeatmap
                todayIso={todayIso}
                habits={habits.map((h) => ({
                  id: h.id,
                  schedule: h.schedule,
                  isActive: h.isActive,
                  createdAt: h.createdAt,
                }))}
                logs={recentLogs.map((l) => ({ habitId: l.habitId, date: l.date }))}
                onCellClick={(iso) => setEditingDate(iso)}
              />
            </div>

            {/* right column: weekly chart, fills the column height */}
            <div className="flex h-full">
              <WeeklyHabitsChart
                todayIso={todayIso}
                habits={habits.map((h) => ({
                  id: h.id,
                  name: h.name,
                  color: h.color,
                  isActive: h.isActive,
                }))}
                logs={recentLogs.map((l) => ({ habitId: l.habitId, date: l.date }))}
              />
            </div>
          </div>
        </section>
      )}

      {/* ── reminder banner ────────────────────────────────────────── */}
      {habits.length > 0 && (
        <div className="border-border shrink-0 border-b px-5 py-3">
          <LogReminder
            lastDate={lastLogDate}
            todayIso={todayIso}
            todayCopy="você ainda não marcou nenhum hábito hoje."
            gapCopy={(n) => `último hábito marcado há ${n} dias.`}
          />
        </div>
      )}

      {/* ── KPI strip ──────────────────────────────────────────────── */}
      {habits.length > 0 && (
        <div className="border-border grid shrink-0 grid-cols-2 border-b sm:grid-cols-4">
          <Kpi
            label="today"
            value={`${kpis.doneToday}/${kpis.activeCount}`}
            accent={
              kpis.activeCount > 0 && kpis.doneToday === kpis.activeCount ? "success" : "primary"
            }
            highlight
          />
          <Kpi
            label="longest streak"
            value={kpis.longestStreak === 0 ? "—" : `${kpis.longestStreak} d`}
          />
          <Kpi
            label="this week"
            value={kpis.weeklyTarget === 0 ? "—" : `${kpis.weeklyDone}/${kpis.weeklyTarget}`}
            hint="weekly targets"
          />
          <Kpi label="active habits" value={String(kpis.activeCount)} />
        </div>
      )}

      {/* ── today view ─────────────────────────────────────────────── */}
      {activeHabits.length === 0 ? (
        <EmptyState onAdd={() => setDialog({ kind: "create" })} />
      ) : (
        <section className="border-border border-b px-5 py-5">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-foreground text-[14px] font-semibold tracking-tight">today</h2>
            <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-[0.16em]">
              {formatToday(todayIso)}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {activeHabits.map((h) => {
              const dates = logsByHabit.get(h.id) ?? new Set<string>();
              const adjusted = new Set(dates);
              const k = `${h.id}|${todayIso}`;
              if (optimistic.has(`+${k}`)) adjusted.add(todayIso);
              if (optimistic.has(`-${k}`)) adjusted.delete(todayIso);
              const done = adjusted.has(todayIso);
              const streak = h.schedule === "daily" ? computeStreak(adjusted, todayIso) : null;
              const weekly =
                h.schedule === "weekly_target"
                  ? {
                      done: computeWeekProgress(adjusted, todayIso),
                      target: h.targetPerWeek ?? 0,
                    }
                  : null;
              return (
                <li key={h.id}>
                  <button
                    type="button"
                    onClick={() => toggleToday(h)}
                    disabled={isToggling}
                    aria-pressed={done}
                    className={cn(
                      "border-border bg-card hover:border-foreground/30 group relative flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-colors",
                      done && "border-success/40 bg-success/[0.04]",
                    )}
                    style={
                      done
                        ? undefined
                        : {
                            borderColor: `color-mix(in oklab, ${h.color} 25%, var(--border))`,
                          }
                    }
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "flex size-7 shrink-0 items-center justify-center rounded-md border transition-all",
                        done
                          ? "border-success/50 bg-success/20 text-success-foreground"
                          : "border-border group-hover:border-foreground/40 text-transparent",
                      )}
                    >
                      <Check className="size-4" strokeWidth={2.5} />
                    </span>
                    <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {h.icon ? (
                          <CategoryIcon icon={h.icon} color={h.color} size={13} />
                        ) : (
                          <span
                            aria-hidden
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: h.color }}
                          />
                        )}
                        <span
                          className={cn(
                            "truncate text-[13.5px] font-medium",
                            done &&
                              "text-muted-foreground decoration-muted-foreground/40 line-through",
                          )}
                        >
                          {h.name}
                        </span>
                        <PolarityBadge polarity={h.polarity} />
                      </div>
                      <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                        {h.categoryName && (
                          <span
                            className="border-border bg-card/60 inline-flex items-center gap-1 rounded-md border px-1 py-px font-medium"
                            style={{
                              borderColor: `color-mix(in oklab, ${h.categoryColor ?? "#7e82aa"} 35%, var(--border))`,
                            }}
                          >
                            <CategoryIcon icon={h.categoryIcon} color={h.categoryColor} size={9} />
                            {h.categoryName}
                          </span>
                        )}
                        {streak !== null && streak > 0 && (
                          <span className="text-primary inline-flex items-center gap-0.5 font-mono">
                            <Flame className="size-2.5" strokeWidth={2} aria-hidden />
                            {streak}
                          </span>
                        )}
                        {weekly && (
                          <span className="font-mono tabular-nums">
                            {weekly.done}/{weekly.target} this week
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* ── all habits list ────────────────────────────────────────── */}
      {habits.length > 0 && (
        <section className="px-5 py-5">
          <div className="mb-3 flex items-baseline gap-2.5">
            <h2 className="text-foreground text-[13px] font-medium tracking-tight">all habits</h2>
            <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-[0.16em]">
              {habits.length} total · {inactiveHabits.length} archived
            </span>
          </div>
          <ul className="border-border divide-border divide-y rounded-lg border">
            {habits.map((h) => (
              <li
                key={h.id}
                className={cn(
                  "hover:bg-muted/30 flex items-center gap-3 px-4 py-2.5 transition-colors",
                  !h.isActive && "opacity-50",
                )}
              >
                <span
                  aria-hidden
                  className="size-3 shrink-0 rounded-full ring-1 ring-black/10"
                  style={{ backgroundColor: h.color }}
                />
                {h.icon ? <CategoryIcon icon={h.icon} color={h.color} size={14} /> : null}
                <span className="text-[13px] font-medium">{h.name}</span>
                <PolarityBadge polarity={h.polarity} />
                <ScheduleBadge habit={h} />
                {h.categoryName && (
                  <span className="text-muted-foreground text-[11.5px]">in {h.categoryName}</span>
                )}
                <span className="ml-auto" />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    aria-label="actions"
                    className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <MoreHorizontal aria-hidden className="size-3.5" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => setDialog({ kind: "edit", habit: h })}>
                      edit
                    </DropdownMenuItem>
                    <DropdownMenuItem variant="destructive" onClick={() => setPendingDelete(h)}>
                      delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ── day editor (heatmap cell click) ───────────────────────── */}
      <DayEditorDialog
        dateIso={editingDate}
        habits={habits}
        logsForDate={editingDate ? recentLogs.filter((l) => l.date === editingDate) : []}
        todayIso={todayIso}
        onClose={() => setEditingDate(null)}
      />

      {/* ── dialogs ────────────────────────────────────────────────── */}
      <Dialog
        open={dialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{dialog.kind === "edit" ? "edit habit" : "new habit"}</DialogTitle>
            <DialogDescription>
              {dialog.kind === "edit"
                ? "update the routine, schedule, or category."
                : "what do you want to track?"}
            </DialogDescription>
          </DialogHeader>
          <HabitForm
            key={dialog.kind === "edit" ? dialog.habit.id : "create"}
            habit={dialog.kind === "edit" ? dialog.habit : undefined}
            categories={categories}
            onSuccess={() => {
              setDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete habit?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete ? `"${pendingDelete.name}" and all its logs will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) handleDelete(pendingDelete);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function formatToday(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
  })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function todayWeekdayLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "long" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function todayDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "long", day: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function PolarityBadge({ polarity }: { polarity: "do" | "avoid" }) {
  if (polarity === "do") {
    return (
      <span
        className="border-success/30 bg-success/10 text-success-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-mono text-[9.5px] tracking-[0.14em] uppercase"
        title="do — log when you did it"
      >
        <CircleCheckBig aria-hidden className="size-2.5" strokeWidth={2} />
        do
      </span>
    );
  }
  return (
    <span
      className="border-destructive/30 bg-destructive/10 text-destructive inline-flex items-center gap-1 rounded-md border px-1.5 py-px font-mono text-[9.5px] tracking-[0.14em] uppercase"
      title="avoid — log when you stayed clean"
    >
      <ShieldOff aria-hidden className="size-2.5" strokeWidth={2} />
      avoid
    </span>
  );
}

function ScheduleBadge({ habit }: { habit: HabitWithCategory }) {
  if (habit.schedule === "daily") {
    return (
      <span className="text-muted-foreground font-mono text-[10.5px] tracking-wider">daily</span>
    );
  }
  return (
    <span className="text-muted-foreground font-mono text-[10.5px] tracking-wider">
      {habit.targetPerWeek}× / week
    </span>
  );
}

function Kpi({
  label,
  value,
  hint,
  accent = "muted",
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  accent?: "muted" | "primary" | "success" | "destructive";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-2 border-b px-6 py-5 sm:border-r sm:border-b-0 sm:last:border-r-0",
        highlight && "bg-primary/[0.05]",
      )}
    >
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.2em]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "text-[24px] leading-none font-semibold tracking-tight tabular-nums",
            accent === "primary" && "text-primary",
            accent === "success" && "text-success",
            accent === "destructive" && "text-destructive",
            accent === "muted" && "text-foreground",
          )}
        >
          {value}
        </span>
        {hint && (
          <span className="text-muted-foreground font-mono text-[11px] tracking-wider">{hint}</span>
        )}
      </div>
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <CircleCheckBig className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no habits yet</h2>
        <p className="text-muted-foreground text-[13px]">
          start small — pick one routine you want to be more consistent with.
        </p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new habit
      </Button>
    </div>
  );
}

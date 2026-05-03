"use client";

import { useMemo } from "react";

import { cn } from "@/lib/utils";

const DAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

const EN_MONTH_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Monday-anchored: 0=Mon..6=Sun. */
function dayOfWeekMon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay(); // 0=Sun..6=Sat
  return (dow - 1 + 7) % 7;
}

type Cell = {
  iso: string;
  done: number;
  isToday: boolean;
  isFuture: boolean;
};

export type HeatmapHabit = {
  id: string;
  schedule: "daily" | "weekly_target";
  isActive: boolean;
  createdAt: Date | string;
};

export type HeatmapLog = {
  habitId: string;
  /** yyyy-mm-dd */
  date: string;
};

type Props = {
  todayIso: string;
  habits: HeatmapHabit[];
  logs: HeatmapLog[];
  /** Optional override for the calendar year shown. Defaults to today's year. */
  year?: number;
  /** Called when the user clicks a non-future cell. */
  onCellClick?: (iso: string) => void;
};

/**
 * GitHub-style contribution heatmap.
 *
 * Layout: weeks as columns, Mon→Sun as rows. Tiny 12px cells with month
 * labels on top spanning their week ranges. Window is rolling — last
 * `weeks` weeks ending on the current week's Sunday — so the grid is
 * always anchored to today.
 *
 * Color intensity scales relative to the busiest day shown, anchoring
 * the brightest swatch to whatever the user's actual peak is (different
 * from a fixed ramp because habit counts are small and bursty).
 */
export function MonthlyHabitHeatmap({
  todayIso,
  habits,
  logs,
  year,
  onCellClick,
}: Props) {
  const activeHabitCount = habits.filter((h) => h.isActive).length;
  const targetYear = year ?? Number(todayIso.slice(0, 4));

  const { columns, totals, monthLabels, maxDone } = useMemo(
    () => buildGrid(todayIso, targetYear, logs),
    [todayIso, targetYear, logs],
  );

  return (
    <div className="flex flex-col gap-2.5">
      {/* Header: stats only — legend lives below the grid */}
      <div className="flex flex-wrap items-baseline gap-3">
        <span className="text-muted-foreground/80 font-mono text-[10.5px] tracking-[0.18em] tabular-nums uppercase">
          {targetYear} · {totals.activeDays} active · {totals.totalChecks} checks
        </span>
      </div>

      {/* Grid + axis labels */}
      <div className="flex items-start gap-1.5 overflow-x-auto pb-1">
        {/* Day-of-week labels on the left */}
        <div
          className="flex flex-col gap-[3px] pt-[14px]"
          aria-hidden
        >
          {DAY_LABELS.map((label, dow) => (
            <span
              key={dow}
              className="text-muted-foreground/60 flex h-[12px] w-[22px] items-center justify-end pr-1 font-mono text-[8.5px] tracking-wider uppercase"
            >
              {label}
            </span>
          ))}
        </div>

        {/* Stack: month labels (top) + week columns (bottom) */}
        <div className="flex flex-col gap-1">
          {/* Month labels — span across the columns where each new month starts */}
          <div className="flex h-[10px] gap-[3px]">
            {monthLabels.map((label, i) => (
              <span
                key={i}
                className="text-muted-foreground/70 font-mono text-[8.5px] tracking-wider uppercase"
                style={{ width: `${label.weeks * 12 + (label.weeks - 1) * 3}px` }}
              >
                {label.text}
              </span>
            ))}
          </div>

          {/* Week columns */}
          <div className="flex gap-[3px]">
            {columns.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[3px]">
                {week.map((cell, ci) => (
                  <HeatmapCell
                    key={ci}
                    cell={cell}
                    maxDone={maxDone}
                    onClick={onCellClick}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer: legend (left) + best day (right) */}
      <div className="text-muted-foreground/60 flex flex-wrap items-center justify-between gap-3 font-mono text-[10px] tracking-wider">
        <span className="flex items-center gap-1.5 text-[9.5px] uppercase">
          less
          {[0, 0.25, 0.5, 0.75, 1].map((p) => (
            <span
              key={p}
              aria-hidden
              className="border-border/50 inline-block size-[10px] rounded-[2px] border"
              style={{ backgroundColor: intensityColor(p) }}
            />
          ))}
          more
        </span>
        <span>
          best day: {totals.bestDay} {totals.bestDay === 1 ? "habit" : "habits"} ·{" "}
          {activeHabitCount} active habits total
        </span>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function buildGrid(
  todayIso: string,
  year: number,
  logs: HeatmapLog[],
): {
  columns: Cell[][];
  totals: { activeDays: number; totalChecks: number; bestDay: number };
  monthLabels: Array<{ text: string; weeks: number }>;
  maxDone: number;
} {
  // Full calendar year window. We extend to the Monday of the week
  // containing Jan 1 and the Sunday of the week containing Dec 31, so
  // every column is a complete week (some cells from neighbouring
  // years are rendered but logs outside `year` are ignored).
  const jan1 = `${year}-01-01`;
  const dec31 = `${year}-12-31`;
  const startOffset = dayOfWeekMon(jan1);
  const firstMonday = shiftDays(jan1, -startOffset);
  const endOffset = 6 - dayOfWeekMon(dec31);
  const lastSunday = shiftDays(dec31, endOffset);
  const totalDays =
    (Date.UTC(...isoToYmd(lastSunday)) - Date.UTC(...isoToYmd(firstMonday))) /
      86400000 +
    1;
  const weeks = totalDays / 7;

  // Bucket logs by date (set of distinct habit ids → done count).
  const byDate = new Map<string, Set<string>>();
  for (const l of logs) {
    if (l.date < firstMonday || l.date > lastSunday) continue;
    const set = byDate.get(l.date);
    if (set) set.add(l.habitId);
    else byDate.set(l.date, new Set([l.habitId]));
  }

  // Build columns of 7 cells each (Mon..Sun).
  const columns: Cell[][] = [];
  let activeDays = 0;
  let totalChecks = 0;
  let bestDay = 0;

  for (let w = 0; w < weeks; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const iso = shiftDays(firstMonday, w * 7 + d);
      const done = byDate.get(iso)?.size ?? 0;
      if (done > 0 && iso.startsWith(`${year}-`)) {
        activeDays += 1;
        totalChecks += done;
        if (done > bestDay) bestDay = done;
      }
      week.push({
        iso,
        done,
        isToday: iso === todayIso,
        isFuture: iso > todayIso,
      });
    }
    columns.push(week);
  }

  // Month labels: walk the columns and group consecutive ones that share
  // the same (year, month). Cells outside the target year get an empty
  // label so all 12 months of `year` are emitted regardless of how many
  // week columns they cover.
  const monthLabels: Array<{ text: string; weeks: number }> = [];
  let runYear = "";
  let runMonthIdx = -1;
  let runWeeks = 0;
  function flush() {
    if (runWeeks === 0) return;
    monthLabels.push({
      text: runYear === `${year}` ? EN_MONTH_SHORT[runMonthIdx]! : "",
      weeks: runWeeks,
    });
  }
  for (let w = 0; w < columns.length; w++) {
    const monday = columns[w]![0]!.iso;
    const monthYear = monday.slice(0, 4);
    const monthIdx = Number(monday.slice(5, 7)) - 1;
    if (monthYear !== runYear || monthIdx !== runMonthIdx) {
      flush();
      runYear = monthYear;
      runMonthIdx = monthIdx;
      runWeeks = 1;
    } else {
      runWeeks += 1;
    }
  }
  flush();

  return {
    columns,
    totals: { activeDays, totalChecks, bestDay },
    monthLabels,
    maxDone: bestDay,
  };
}

function isoToYmd(iso: string): [number, number, number] {
  const [y, m, d] = iso.split("-").map(Number);
  return [y, m - 1, d];
}

function HeatmapCell({
  cell,
  maxDone,
  onClick,
}: {
  cell: Cell;
  maxDone: number;
  onClick?: (iso: string) => void;
}) {
  const ratio =
    cell.done === 0 ? 0 : maxDone <= 0 ? 1 : Math.min(cell.done / maxDone, 1);
  const tooltip = `${cell.iso} — ${cell.done} ${cell.done === 1 ? "habit" : "habits"}${
    cell.isFuture ? " (future)" : ""
  }`;

  if (cell.isFuture) {
    return (
      <span
        aria-hidden
        title={cell.iso}
        className="border-border/40 size-[12px] shrink-0 rounded-[2px] border border-dashed"
      />
    );
  }

  if (!onClick) {
    return (
      <span
        aria-hidden
        title={tooltip}
        className={cn(
          "size-[12px] shrink-0 rounded-[2px]",
          cell.isToday && "ring-primary/70 ring-1 ring-offset-1 ring-offset-background",
        )}
        style={{ backgroundColor: intensityColor(ratio) }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick(cell.iso)}
      aria-label={tooltip}
      title={tooltip}
      className={cn(
        "focus-visible:ring-ring size-[12px] shrink-0 cursor-pointer rounded-[2px] transition-transform hover:scale-150 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:outline-none",
        cell.isToday && "ring-primary/70 ring-1 ring-offset-1 ring-offset-background",
      )}
      style={{ backgroundColor: intensityColor(ratio) }}
    />
  );
}

/**
 * Map a 0..1 completion ratio to a color from a calm aqua ramp.
 * 0 = empty (very subtle border-tinted), 1 = full primary.
 */
function intensityColor(ratio: number): string {
  if (ratio <= 0) return "color-mix(in oklab, var(--muted) 70%, transparent)";
  if (ratio < 0.3) return "oklch(0.82 0.05 200 / 0.55)";
  if (ratio < 0.6) return "oklch(0.74 0.09 200 / 0.8)";
  if (ratio < 0.85) return "oklch(0.66 0.12 200)";
  return "oklch(0.56 0.14 200)";
}

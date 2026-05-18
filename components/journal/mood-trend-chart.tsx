"use client";

import { ChevronDown, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

import { MOODS, type MoodLevel } from "@/lib/journal/mood";
import type { JournalEntryRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

/**
 * Lunar palette mapped onto the five mood steps — goes from a cool,
 * quiet pesado to the warm gold of radiante. Slightly translucent so
 * the cells feel like washes of colour rather than solid swatches.
 */
const MOOD_COLOR: Record<MoodLevel, string> = {
  1: "oklch(0.55 0.05 265 / 0.78)", // muted lunar blue-purple
  2: "oklch(0.62 0.045 325 / 0.78)", // soft mauve
  3: "oklch(0.65 0.10 200 / 0.78)", // aqua / lunar light
  4: "oklch(0.74 0.06 55 / 0.78)", // sand
  5: "oklch(0.78 0.10 70 / 0.78)", // moonlit gold
};

/** Returns the Monday (local) of the ISO week containing `dateStr`. */
function startOfIsoWeek(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const dow = date.getDay() || 7;
  date.setDate(date.getDate() - dow + 1);
  return date;
}

function isoKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

function fmtDayLong(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
  })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function fmtMonthShort(d: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { month: "short" })
    .format(d)
    .toLowerCase()
    .replace(/\.$/, "");
}

const WEEKS_TO_SHOW = 14; // ~3 months
const DAY_LABELS = ["seg", "ter", "qua", "qui", "sex", "sáb", "dom"]; // Mon..Sun

export function MoodTrendChart({ entries }: { entries: JournalEntryRow[] }) {
  const [open, setOpen] = useState(false);
  const { weeks, totals, total, dominant, monthHeaders } = useMemo(() => {
    // dateStr -> mood
    const byDate = new Map<string, MoodLevel>();
    const totals: Record<MoodLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    for (const e of entries) {
      if (e.mood == null) continue;
      byDate.set(e.entryDate, e.mood as MoodLevel);
      totals[e.mood as MoodLevel] += 1;
    }

    // Anchor the grid on the ISO week of "today" so the most recent
    // column is always the current week.
    const today = new Date();
    const lastWeekStart = startOfIsoWeek(isoKey(today));
    const firstWeekStart = addDays(lastWeekStart, -7 * (WEEKS_TO_SHOW - 1));

    type Cell = { date: string; mood: MoodLevel | null; future: boolean };
    const weeks: { weekStart: Date; cells: Cell[] }[] = [];
    const todayKey = isoKey(today);

    for (let w = 0; w < WEEKS_TO_SHOW; w += 1) {
      const weekStart = addDays(firstWeekStart, w * 7);
      const cells: Cell[] = [];
      for (let d = 0; d < 7; d += 1) {
        const cellDate = addDays(weekStart, d);
        const key = isoKey(cellDate);
        cells.push({
          date: key,
          mood: byDate.get(key) ?? null,
          future: key > todayKey,
        });
      }
      weeks.push({ weekStart, cells });
    }

    // Build month header positions so we can label the columns with
    // the month they belong to without clutter.
    const monthHeaders: { col: number; label: string }[] = [];
    let lastMonth = -1;
    weeks.forEach((wk, idx) => {
      const m = wk.weekStart.getMonth();
      if (m !== lastMonth) {
        monthHeaders.push({ col: idx, label: fmtMonthShort(wk.weekStart) });
        lastMonth = m;
      }
    });

    const total = entries.filter((e) => e.mood != null).length;
    let dominant: MoodLevel | null = null;
    let dominantCount = 0;
    for (const lvl of [1, 2, 3, 4, 5] as MoodLevel[]) {
      if (totals[lvl] > dominantCount) {
        dominant = lvl;
        dominantCount = totals[lvl];
      }
    }

    return { weeks, totals, total, dominant, monthHeaders };
  }, [entries]);

  if (total < 2) return null;

  const dominantMood = dominant ? MOODS.find((m) => m.value === dominant) : null;

  return (
    <section className="border-border/60 bg-card/55 relative flex flex-col overflow-hidden rounded-xl border backdrop-blur-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="mood-trend-content"
        className="hover:bg-muted/30 flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left transition-colors sm:px-4"
      >
        <div className="flex flex-wrap items-baseline gap-2">
          <h3 className="text-foreground flex items-center gap-1.5 text-[13px] font-medium tracking-tight">
            <TrendingUp aria-hidden className="text-accent size-3.5" strokeWidth={1.7} />
            evolução do humor
          </h3>
          {dominantMood && (
            <span className="text-muted-foreground text-[11.5px]">
              · predominante:{" "}
              <span className="text-foreground font-medium">{dominantMood.label}</span>
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.14em] uppercase">
            {total} {total === 1 ? "dia" : "dias"}
          </span>
          <ChevronDown
            aria-hidden
            className={cn(
              "text-muted-foreground size-3.5 transition-transform duration-200",
              open && "rotate-180",
            )}
            strokeWidth={1.7}
          />
        </div>
      </button>

      {/* Animated reveal — uses the grid-rows 0fr→1fr trick so the
          container smoothly grows to the natural content height. */}
      <div
        id="mood-trend-content"
        aria-hidden={!open}
        className={cn(
          "grid transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
        )}
      >
        <div className="overflow-hidden">
          <div
            className={cn(
              "border-border/40 flex flex-col gap-3 border-t p-3 transition-transform duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)] sm:p-4",
              open ? "translate-y-0" : "-translate-y-1",
            )}
          >
            {/* ── Frequency chips ──────────────────────────────────────── */}
            <div className="flex flex-wrap items-center gap-1.5">
              {MOODS.map((m) => {
                const count = totals[m.value];
                const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                const Icon = m.icon;
                const isDominant = m.value === dominant && count > 0;
                return (
                  <div
                    key={m.value}
                    className={
                      "border-border/60 bg-muted/30 flex items-center gap-1.5 rounded-full border px-2 py-1 text-[11px] " +
                      (isDominant ? "border-foreground/30 bg-muted/60" : "")
                    }
                    title={`${m.label}: ${count} ${count === 1 ? "dia" : "dias"} (${pct}%)`}
                  >
                    <Icon
                      className="size-3 shrink-0"
                      strokeWidth={1.7}
                      aria-hidden
                      style={{ color: MOOD_COLOR[m.value] }}
                    />
                    <span className="text-foreground/80">{m.label}</span>
                    <span className="text-muted-foreground font-mono text-[10px] tabular-nums">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* ── Calendar heatmap ─────────────────────────────────────── */}
            <div className="overflow-x-auto">
              <div className="inline-flex flex-col gap-1">
                {/* Month labels */}
                <div className="ml-[22px] grid auto-cols-[12px] grid-flow-col gap-[3px]">
                  {weeks.map((_, idx) => {
                    const header = monthHeaders.find((h) => h.col === idx);
                    return (
                      <span
                        key={idx}
                        className="text-muted-foreground/70 font-mono text-[8.5px] tracking-[0.14em] uppercase"
                        style={{ height: 10 }}
                      >
                        {header?.label ?? ""}
                      </span>
                    );
                  })}
                </div>

                {/* Weekday rows × week columns */}
                <div className="flex gap-1">
                  {/* Weekday labels column */}
                  <div className="flex w-[18px] flex-col gap-[3px]">
                    {DAY_LABELS.map((d, i) => (
                      <span
                        key={d}
                        className="text-muted-foreground/60 font-mono text-[8.5px] leading-[12px]"
                        style={{ height: 12 }}
                      >
                        {i % 2 === 0 ? d : ""}
                      </span>
                    ))}
                  </div>

                  {/* Grid */}
                  <div className="grid auto-cols-[12px] grid-flow-col gap-[3px]">
                    {weeks.map((wk, wIdx) => (
                      <div key={wIdx} className="flex flex-col gap-[3px]">
                        {wk.cells.map((cell) => {
                          if (cell.future) {
                            return (
                              <div
                                key={cell.date}
                                className="size-[12px] rounded-[2px]"
                                style={{ background: "transparent" }}
                                aria-hidden
                              />
                            );
                          }
                          const moodDesc = cell.mood
                            ? MOODS.find((m) => m.value === cell.mood)
                            : null;
                          const title = moodDesc
                            ? `${fmtDayLong(cell.date)} — ${moodDesc.label}`
                            : `${fmtDayLong(cell.date)} — sem registro`;
                          return (
                            <div
                              key={cell.date}
                              title={title}
                              className="hover:border-foreground/30 size-[12px] rounded-[2px] border border-transparent transition-transform duration-150 hover:scale-[1.3]"
                              style={{
                                background: cell.mood
                                  ? MOOD_COLOR[cell.mood]
                                  : "color-mix(in oklab, var(--muted) 55%, transparent)",
                              }}
                            />
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

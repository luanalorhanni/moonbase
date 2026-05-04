"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DAY_LABELS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function shiftDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function dayOfWeekMon(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return (dow - 1 + 7) % 7;
}

function mondayOf(iso: string): string {
  return shiftDays(iso, -dayOfWeekMon(iso));
}

const FALLBACK_COLOR = "oklch(0.62 0.04 245)"; // muted neutral for empty days

/** Average a list of #rrggbb hex strings componentwise, returning hex. */
function mixHex(hexes: string[]): string | null {
  if (hexes.length === 0) return null;
  if (hexes.length === 1) return hexes[0]!;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;
  for (const hex of hexes) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) continue;
    const v = parseInt(m[1]!, 16);
    r += (v >> 16) & 0xff;
    g += (v >> 8) & 0xff;
    b += v & 0xff;
    count += 1;
  }
  if (count === 0) return null;
  const avg = (n: number) =>
    Math.round(n / count)
      .toString(16)
      .padStart(2, "0");
  return `#${avg(r)}${avg(g)}${avg(b)}`;
}

export type WeeklyChartHabit = {
  id: string;
  name: string;
  color: string;
  isActive: boolean;
};

export type WeeklyChartLog = {
  habitId: string;
  date: string;
};

type Props = {
  todayIso: string;
  habits: WeeklyChartHabit[];
  logs: WeeklyChartLog[];
};

type DayPoint = {
  label: string;
  iso: string;
  isFuture: boolean;
  /** Total habits checked that day (drives the line). */
  done: number | null;
  /** Subset of `habits` that were done that day — used for tooltip rendering. */
  doneHabits: WeeklyChartHabit[];
};

/**
 * Single line aggregating the total habits checked each day across the
 * week. Tooltip on hover breaks down which specific habits the user
 * completed that day, each chip colored with its own habit color so
 * they're identifiable at a glance.
 */
export function WeeklyHabitsChart({ todayIso, habits, logs }: Props) {
  const activeHabits = habits.filter((h) => h.isActive);
  const weekStart = mondayOf(todayIso);

  // Bucket logs by date → set of habit ids logged that day.
  const byDate = new Map<string, Set<string>>();
  for (const l of logs) {
    const set = byDate.get(l.date);
    if (set) set.add(l.habitId);
    else byDate.set(l.date, new Set([l.habitId]));
  }

  let totalDoneThisWeek = 0;
  const data: DayPoint[] = Array.from({ length: 7 }, (_, i) => {
    const iso = shiftDays(weekStart, i);
    const isFuture = iso > todayIso;
    const todays = byDate.get(iso) ?? new Set<string>();
    const doneHabits = activeHabits.filter((h) => todays.has(h.id));
    if (!isFuture) totalDoneThisWeek += doneHabits.length;
    return {
      label: DAY_LABELS[i]!,
      iso,
      isFuture,
      done: isFuture ? null : doneHabits.length,
      doneHabits,
    };
  });

  const possibleSoFar = data.filter((d) => !d.isFuture).length * activeHabits.length;
  const consistency = possibleSoFar > 0 ? Math.round((totalDoneThisWeek / possibleSoFar) * 100) : 0;

  // Per-day mixed color used to drive the line/area gradient. Days with
  // zero checks fall back to the muted neutral so they don't yank the
  // gradient toward an arbitrary palette.
  const dayColors = data.map((d) => mixHex(d.doneHabits.map((h) => h.color)) ?? FALLBACK_COLOR);

  // Build a label → "dd/mm" map for the X axis tick subtitle.
  const datesByLabel = new Map(
    data.map((d) => {
      const [, mm, dd] = d.iso.split("-");
      return [d.label, `${dd}/${mm}`];
    }),
  );

  return (
    <div className="border-border/60 bg-card/40 flex h-full w-full min-w-[260px] flex-col gap-3 rounded-lg border p-4">
      <div className="flex items-baseline justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 className="font-display text-foreground text-[18px] leading-none font-light tracking-tight italic">
            this week
          </h3>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.18em] uppercase">
            mon → sun
          </span>
        </div>
        <div className="flex flex-col items-end gap-0.5">
          <span className="text-foreground numeric text-[20px] leading-none font-semibold tabular-nums">
            {totalDoneThisWeek}
          </span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-wider tabular-nums">
            checks · {consistency}%
          </span>
        </div>
      </div>

      <div className="min-h-[140px] w-full flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 18, right: 12, bottom: 4, left: 0 }}>
            <defs>
              {/* Stroke gradient — interpolates left→right through each
                   day's mixed habit color. Days with zero checks pin to
                   FALLBACK_COLOR so the curve doesn't drift through a
                   random hue. */}
              <linearGradient id="weekly-stroke-gradient" x1="0" y1="0" x2="1" y2="0">
                {dayColors.map((color, i) => (
                  <stop
                    key={i}
                    offset={`${(i / Math.max(dayColors.length - 1, 1)) * 100}%`}
                    stopColor={color}
                  />
                ))}
              </linearGradient>
              {/* Vertical fade for the area fill. Same gradient at top
                   (for the colored crest) softens to transparent near
                   the baseline. */}
              <linearGradient id="weekly-fill-top" x1="0" y1="0" x2="1" y2="0">
                {dayColors.map((color, i) => (
                  <stop
                    key={i}
                    offset={`${(i / Math.max(dayColors.length - 1, 1)) * 100}%`}
                    stopColor={color}
                    stopOpacity={0.4}
                  />
                ))}
              </linearGradient>
              <linearGradient id="weekly-fill-fade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0.3} />
                <stop offset="100%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              height={32}
              interval={0}
              tick={<DayDateTick datesByLabel={datesByLabel} />}
            />
            <YAxis domain={[0, Math.max(activeHabits.length, 1)]} allowDecimals={false} hide />
            <Tooltip
              cursor={{ stroke: "var(--border)", strokeDasharray: "2 2" }}
              content={<HabitTooltip />}
            />
            {activeHabits.length > 0 && (
              <ReferenceLine
                y={activeHabits.length}
                stroke="oklch(0.6 0.04 200 / 0.45)"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
              />
            )}
            {/* Soft fill area under the line for atmospheric depth. */}
            <Area
              type="monotone"
              dataKey="done"
              stroke="none"
              fill="url(#weekly-fill-fade)"
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            {/* Color overlay from the per-day gradient, kept low-opacity
                so it tints the area without overpowering the crest. */}
            <Area
              type="monotone"
              dataKey="done"
              stroke="none"
              fill="url(#weekly-fill-top)"
              connectNulls={false}
              isAnimationActive={false}
              activeDot={false}
            />
            <Line
              type="monotone"
              dataKey="done"
              stroke="url(#weekly-stroke-gradient)"
              strokeWidth={2.25}
              dot={(p: { cx?: number; cy?: number; index?: number; payload?: DayPoint }) => {
                const { cx, cy, index = 0, payload } = p;
                if (cx == null || cy == null || !payload || payload.done == null) {
                  return <g key={index} />;
                }
                const fill = dayColors[index] ?? FALLBACK_COLOR;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={3.5}
                    fill={fill}
                    stroke="var(--background)"
                    strokeWidth={1.5}
                  />
                );
              }}
              activeDot={(p: { cx?: number; cy?: number; index?: number }) => {
                const { cx, cy, index = 0 } = p;
                if (cx == null || cy == null) return <g key={index} />;
                const fill = dayColors[index] ?? FALLBACK_COLOR;
                return (
                  <circle
                    key={index}
                    cx={cx}
                    cy={cy}
                    r={5}
                    fill={fill}
                    stroke="var(--background)"
                    strokeWidth={2}
                  />
                );
              }}
              connectNulls={false}
              isAnimationActive={false}
            >
              <LabelList
                dataKey="done"
                position="top"
                offset={8}
                fill="var(--foreground)"
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                formatter={(v: unknown) => (v == null || v === 0 ? "" : String(v))}
              />
            </Line>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * Custom tooltip: instead of the generic "done: 3" line, list each
 * habit completed that day with a swatch in the habit's own color.
 * Future / no-data days fall back to a quiet "no checks" line.
 */
function HabitTooltip(props: { active?: boolean; payload?: Array<{ payload?: DayPoint }> }) {
  const { active, payload } = props;
  if (!active || !payload || payload.length === 0) return null;
  const point = payload[0]?.payload;
  if (!point) return null;

  const [, mm, dd] = point.iso.split("-");
  const dateLabel = `${point.label} ${dd}/${mm}`;

  return (
    <div
      className="border-border bg-popover text-popover-foreground rounded-md border px-2.5 py-2 font-mono text-[11px] shadow-md"
      style={{ backdropFilter: "blur(8px)" }}
    >
      <div className="text-muted-foreground mb-1.5 text-[9.5px] tracking-[0.16em] uppercase">
        {dateLabel}
      </div>
      {point.isFuture ? (
        <div className="text-muted-foreground/70 italic">future</div>
      ) : point.doneHabits.length === 0 ? (
        <div className="text-muted-foreground/70">no checks</div>
      ) : (
        <ul className="flex flex-col gap-1">
          {point.doneHabits.map((h) => (
            <li key={h.id} className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: h.color }}
              />
              <span className="text-foreground">{h.name}</span>
            </li>
          ))}
          <li className="text-muted-foreground border-border/50 mt-1 border-t pt-1 text-[9.5px] tracking-wider uppercase tabular-nums">
            total: {point.doneHabits.length}
          </li>
        </ul>
      )}
    </div>
  );
}

/**
 * Two-line X-axis tick: day-of-week label on top, dd/mm date below.
 * Recharts injects x/y/payload — we just look up the date by the label
 * string.
 */
function DayDateTick(props: {
  x?: number;
  y?: number;
  payload?: { value: string };
  datesByLabel: Map<string, string>;
}) {
  const { x = 0, y = 0, payload, datesByLabel } = props;
  const label = payload?.value ?? "";
  const date = datesByLabel.get(label) ?? "";
  return (
    <g transform={`translate(${x},${y})`}>
      <text
        x={0}
        y={10}
        textAnchor="middle"
        fontSize={9.5}
        fontFamily="var(--font-mono)"
        letterSpacing="0.18em"
        fill="currentColor"
        className="text-muted-foreground"
      >
        {label}
      </text>
      <text
        x={0}
        y={22}
        textAnchor="middle"
        fontSize={8.5}
        fontFamily="var(--font-mono)"
        letterSpacing="0.06em"
        fill="currentColor"
        className="text-muted-foreground/55"
      >
        {date}
      </text>
    </g>
  );
}

"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

import type { CalendarEvent } from "@/lib/google-calendar";
import { cn } from "@/lib/utils";

const HOUR_PX = 48; // height of one hour cell
const DAY_LABELS_LONG = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
const MONTHS_SHORT = [
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

/**
 * Google's published color palette for events with a colorId set.
 * Falls back to the brand aqua for events without one.
 */
const GOOGLE_EVENT_COLORS: Record<string, string> = {
  "1": "#7986cb", // Lavender
  "2": "#33b679", // Sage
  "3": "#8e24aa", // Grape
  "4": "#e67c73", // Flamingo
  "5": "#f6c026", // Banana
  "6": "#f5511d", // Tangerine
  "7": "#039be5", // Peacock
  "8": "#616161", // Graphite
  "9": "#3f51b5", // Blueberry
  "10": "#0b8043", // Basil
  "11": "#d50000", // Tomato
};
const DEFAULT_EVENT_COLOR = "oklch(0.65 0.10 200)";

/**
 * Pick the most specific color available for an event:
 *   1. Per-event colorId (user explicitly chose a color in google)
 *   2. Calendar's color (calendarColor — set by the multi-calendar fetch)
 *   3. Brand aqua fallback
 */
function eventColor(event: { colorId: string | null; calendarColor: string }): string {
  if (event.colorId && GOOGLE_EVENT_COLORS[event.colorId]) {
    return GOOGLE_EVENT_COLORS[event.colorId]!;
  }
  return event.calendarColor || DEFAULT_EVENT_COLOR;
}

type Props = {
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
};

export function WeekView({ events, onEventClick }: Props) {
  const [weekStart, setWeekStart] = useState(() => sundayOf(new Date()));
  const scrollRef = useRef<HTMLDivElement>(null);

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  // Auto-scroll to ~7am on first mount so the user starts at a useful
  // hour instead of midnight.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 7 * HOUR_PX;
    }
  }, []);

  // Bucket events by day key for the all-day row + by visible week for
  // the timed grid. We pre-compute day keys once.
  const visibleEvents = useMemo(() => {
    const start = startOfDay(days[0]!).getTime();
    const end = endOfDay(days[6]!).getTime();
    return events.filter((e) => {
      const evStart = parseStart(e).getTime();
      return evStart >= start && evStart <= end;
    });
  }, [events, days]);

  const allDayByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visibleEvents) {
      if (!e.isAllDay) continue;
      const key = e.start.slice(0, 10);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [visibleEvents]);

  const timedByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of visibleEvents) {
      if (e.isAllDay) continue;
      const key = startOfDay(parseStart(e)).toISOString().slice(0, 10);
      const list = map.get(key);
      if (list) list.push(e);
      else map.set(key, [e]);
    }
    return map;
  }, [visibleEvents]);

  function shiftWeek(delta: number) {
    setWeekStart((w) => addDays(w, delta * 7));
  }
  function goToday() {
    setWeekStart(sundayOf(new Date()));
  }

  const todayIso = startOfDay(new Date()).toISOString().slice(0, 10);
  const monthLabel = formatMonthRange(days[0]!, days[6]!);

  return (
    <div className="border-border bg-card/40 flex flex-col overflow-hidden rounded-lg border">
      {/* ── toolbar ─────────────────────────────────────────────── */}
      <div className="border-border flex items-center justify-between gap-3 border-b px-4 py-2.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            aria-label="previous week"
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.7} />
          </button>
          <button
            type="button"
            onClick={goToday}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border px-2.5 py-1 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors"
          >
            today
          </button>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            aria-label="next week"
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronRight className="size-3.5" strokeWidth={1.7} />
          </button>
        </div>
        <span className="font-display text-foreground text-[16px] font-light tracking-tight italic">
          {monthLabel}
        </span>
      </div>

      {/* ── day headers ─────────────────────────────────────────── */}
      <div
        className="border-border bg-muted/20 grid border-b"
        style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
      >
        <div /> {/* spacer above the hour gutter */}
        {days.map((day) => {
          const iso = startOfDay(day).toISOString().slice(0, 10);
          const isToday = iso === todayIso;
          return (
            <div
              key={iso}
              className={cn(
                "border-border flex flex-col items-center gap-0.5 border-l py-2",
                isToday && "bg-primary/[0.06]",
              )}
            >
              <span
                className={cn(
                  "font-mono text-[10.5px] tracking-[0.18em] uppercase",
                  isToday ? "text-primary font-medium" : "text-muted-foreground/70",
                )}
              >
                {DAY_LABELS_LONG[day.getDay()]}
              </span>
              <span
                className={cn(
                  "numeric text-[18px] font-semibold tabular-nums",
                  isToday ? "text-primary" : "text-foreground",
                )}
              >
                {day.getDate()}
              </span>
            </div>
          );
        })}
      </div>

      {/* ── all-day strip ───────────────────────────────────────── */}
      {[...allDayByDay.values()].some((list) => list.length > 0) && (
        <div
          className="border-border bg-muted/10 grid border-b"
          style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}
        >
          <div className="text-muted-foreground/60 flex items-start justify-end px-2 py-2 font-mono text-[9.5px] tracking-wider uppercase">
            all day
          </div>
          {days.map((day) => {
            const iso = startOfDay(day).toISOString().slice(0, 10);
            const list = allDayByDay.get(iso) ?? [];
            return (
              <div
                key={iso}
                className="border-border flex min-h-[28px] flex-col gap-1 border-l p-1"
              >
                {list.map((e) => (
                  <AllDayChip key={e.id} event={e} onClick={onEventClick} />
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* ── scrollable timed grid ───────────────────────────────── */}
      <div ref={scrollRef} className="relative max-h-[640px] overflow-y-auto">
        <div className="grid" style={{ gridTemplateColumns: `60px repeat(7, minmax(0, 1fr))` }}>
          {/* hour gutter */}
          <div className="flex flex-col">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className="text-muted-foreground/60 flex items-start justify-end pr-2 font-mono text-[9.5px] tabular-nums"
                style={{ height: HOUR_PX }}
              >
                {i === 0 ? "" : `${pad(i)}:00`}
              </div>
            ))}
          </div>

          {/* day columns */}
          {days.map((day) => {
            const iso = startOfDay(day).toISOString().slice(0, 10);
            const isToday = iso === todayIso;
            const timedEvents = timedByDay.get(iso) ?? [];
            return (
              <DayColumn
                key={iso}
                day={day}
                isToday={isToday}
                events={timedEvents}
                onEventClick={onEventClick}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function DayColumn({
  day,
  isToday,
  events,
  onEventClick,
}: {
  day: Date;
  isToday: boolean;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  // Compute the current-time line position (only on the today column).
  const [nowOffset, setNowOffset] = useState<number | null>(null);
  useEffect(() => {
    if (!isToday) {
      setNowOffset(null);
      return;
    }
    const update = () => {
      const now = new Date();
      const offset = (now.getHours() + now.getMinutes() / 60) * HOUR_PX;
      setNowOffset(offset);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [isToday]);

  // Lay out overlapping events into "lanes" so they sit side-by-side
  // instead of stacking on top of one another. Simple greedy: sort by
  // start, drop each event into the first lane whose last event ended
  // before it starts.
  const layouts = useMemo(() => layoutEvents(events, day), [events, day]);

  return (
    <div
      className={cn("border-border relative border-l", isToday && "bg-primary/[0.025]")}
      style={{ height: HOUR_PX * 24 }}
    >
      {/* hour grid lines */}
      {Array.from({ length: 24 }, (_, i) => (
        <div
          key={i}
          aria-hidden
          className="border-border/40 absolute right-0 left-0 border-t"
          style={{ top: i * HOUR_PX }}
        />
      ))}

      {/* current-time indicator */}
      {nowOffset !== null && (
        <div
          aria-hidden
          className="bg-destructive pointer-events-none absolute right-0 left-0 z-20 h-[2px]"
          style={{ top: nowOffset }}
        >
          <span className="bg-destructive absolute -top-[3px] -left-[3px] block size-2 rounded-full" />
        </div>
      )}

      {/* events */}
      {layouts.map(({ event, top, height, depth }) => (
        <EventBlock
          key={event.id}
          event={event}
          top={top}
          height={height}
          depth={depth}
          onClick={onEventClick}
        />
      ))}
    </div>
  );
}

function EventBlock({
  event,
  top,
  height,
  depth,
  onClick,
}: {
  event: CalendarEvent;
  top: number;
  height: number;
  depth: number;
  onClick: (event: CalendarEvent) => void;
}) {
  const color = eventColor(event);
  const tooShort = height < 30;

  // Stacked layout: each overlapping event is offset 8px to the right
  // and 4px down so the previous event's left edge stays visible.
  // Hover bumps z-index to bring the focused card on top.
  const offsetX = depth * 8;
  const offsetY = depth * 2;
  const baseZ = 10 + depth;

  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      title={event.summary ?? "(no title)"}
      className={cn(
        "absolute flex flex-col items-start overflow-hidden rounded-md px-1.5 py-1 text-left text-[10.5px] leading-tight shadow-sm transition-all duration-150 hover:z-50 hover:scale-[1.03] hover:shadow-md focus-visible:z-50 focus-visible:scale-[1.03] focus-visible:shadow-md focus-visible:outline-none",
        tooShort && "py-0.5",
      )}
      style={{
        top: top + offsetY,
        height: Math.max(height, 18),
        left: `${2 + offsetX}px`,
        right: "2px",
        zIndex: baseZ,
        backgroundColor: `color-mix(in oklab, ${color} 30%, var(--background))`,
        borderLeft: `3px solid ${color}`,
        color: "var(--foreground)",
      }}
    >
      <div
        className={cn("w-full truncate font-medium", tooShort && "text-[9.5px]")}
        style={{ color }}
      >
        {event.summary ?? "(no title)"}
      </div>
      {!tooShort && (
        <div className="text-foreground/70 w-full truncate font-mono text-[9px] tabular-nums">
          {formatTime(event.start)}
          {!event.isAllDay && event.end && ` – ${formatTime(event.end)}`}
        </div>
      )}
    </button>
  );
}

function AllDayChip({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}) {
  const color = eventColor(event);
  return (
    <button
      type="button"
      onClick={() => onClick(event)}
      className="inline-flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[10.5px] leading-tight transition-transform hover:scale-[1.02] focus-visible:outline-none"
      style={{
        backgroundColor: `color-mix(in oklab, ${color} 30%, var(--background))`,
        color,
      }}
      title={event.summary ?? "(no title)"}
    >
      <span className="truncate font-medium">{event.summary ?? "(no title)"}</span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

type Layout = {
  event: CalendarEvent;
  top: number;
  height: number;
  /** Number of earlier-starting events that overlap this one. Drives
   *  the stacked offset + z-index in the EventBlock. */
  depth: number;
};

/**
 * Lay out events as a stack of cards. Earlier events render at the
 * back; later (overlapping) events are offset 8px to the right and
 * stacked on top — so each card's left edge still peeks out from
 * behind the next, and hovering any card brings it to the front.
 */
function layoutEvents(events: CalendarEvent[], dayStart: Date): Layout[] {
  if (events.length === 0) return [];
  const sorted = [...events].sort((a, b) => parseStart(a).getTime() - parseStart(b).getTime());
  const dayStartMs = startOfDay(dayStart).getTime();

  return sorted.map((event, i) => {
    const startMs = Math.max(parseStart(event).getTime(), dayStartMs);
    const endMs = parseEnd(event).getTime();
    const startHr = (startMs - dayStartMs) / 3_600_000;
    const durHr = Math.max((endMs - startMs) / 3_600_000, 0.25); // min 15min visual

    // Depth = number of earlier-starting events that haven't ended yet
    // when this one begins. Caps at 6 so the stack doesn't drift past
    // the column edge for absurdly busy days.
    let depth = 0;
    for (let j = 0; j < i; j++) {
      const otherEnd = parseEnd(sorted[j]!).getTime();
      if (otherEnd > startMs) depth += 1;
    }

    return {
      event,
      top: startHr * HOUR_PX,
      height: durHr * HOUR_PX,
      depth: Math.min(depth, 6),
    };
  });
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function startOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(0, 0, 0, 0);
  return r;
}

function endOfDay(d: Date): Date {
  const r = new Date(d);
  r.setHours(23, 59, 59, 999);
  return r;
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

/** Sunday at 00:00 of the week containing `d` — matches the user's
 *  Google Calendar setting where the week starts on Sunday. */
function sundayOf(d: Date): Date {
  const r = startOfDay(d);
  const dow = r.getDay(); // 0=Sun..6=Sat
  r.setDate(r.getDate() - dow);
  return r;
}

function parseStart(e: CalendarEvent): Date {
  return new Date(e.start);
}

function parseEnd(e: CalendarEvent): Date {
  return new Date(e.end);
}

function formatTime(iso: string): string {
  if (!iso.includes("T")) return "";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function formatMonthRange(start: Date, end: Date): string {
  const sm = MONTHS_SHORT[start.getMonth()]!;
  const em = MONTHS_SHORT[end.getMonth()]!;
  const sy = start.getFullYear();
  const ey = end.getFullYear();
  if (sy !== ey) return `${sm} ${sy} → ${em} ${ey}`;
  if (sm === em) return `${sm} ${sy}`;
  return `${sm} → ${em} ${sy}`;
}

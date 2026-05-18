"use client";

import { BellRing, CalendarPlus } from "lucide-react";

type Props = {
  /** ISO date (YYYY-MM-DD) of the most recent log, or null if there are no logs at all. */
  lastDate: string | null;
  /** Today's ISO date in local time. */
  todayIso: string;
  /** Singular wording: "registrar hoje" / "marcar algum hábito". */
  todayCopy: string;
  /** Gap wording fn — e.g. (n) => `último registro há ${n} dias`. */
  gapCopy: (days: number) => string;
  /** Optional CTA label and handler shown on the right. */
  actionLabel?: string;
  onAction?: () => void;
};

function daysBetween(fromIso: string, toIso: string): number {
  const [fy, fm, fd] = fromIso.split("-").map(Number);
  const [ty, tm, td] = toIso.split("-").map(Number);
  const a = new Date(fy, fm - 1, fd).getTime();
  const b = new Date(ty, tm - 1, td).getTime();
  return Math.round((b - a) / 86_400_000);
}

/**
 * Tiny inline banner that nudges the user when today has no log, or when
 * several days have passed since the last one. Silent when "today" is
 * already covered.
 */
export function LogReminder({
  lastDate,
  todayIso,
  todayCopy,
  gapCopy,
  actionLabel,
  onAction,
}: Props) {
  // Already logged today → nothing to nag about.
  if (lastDate === todayIso) return null;

  const days = lastDate ? daysBetween(lastDate, todayIso) : null;

  // Tone deepens slightly when the gap grows. Stays calm — never red.
  const isStale = days != null && days >= 3;
  const message = days == null || days <= 1 ? todayCopy : gapCopy(days);

  return (
    <div
      role="status"
      className={
        "flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-[12px] " +
        (isStale
          ? "border-warning/30 bg-warning/[0.06] text-foreground/85"
          : "border-border/70 bg-muted/30 text-foreground/80")
      }
    >
      <div className="flex min-w-0 items-center gap-2">
        <BellRing
          aria-hidden
          className={
            isStale ? "text-warning size-3.5 shrink-0" : "text-primary/70 size-3.5 shrink-0"
          }
          strokeWidth={1.7}
        />
        <span className="truncate">{message}</span>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="text-foreground hover:bg-background/60 border-border-strong inline-flex h-6 shrink-0 items-center gap-1 rounded-md border bg-transparent px-2 font-mono text-[10.5px] tracking-[0.08em] uppercase transition-colors"
        >
          <CalendarPlus aria-hidden className="size-3" strokeWidth={1.7} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}

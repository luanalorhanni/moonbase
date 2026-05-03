"use client";

import { CalendarRange } from "lucide-react";

import { moodFor } from "@/lib/journal/mood";
import type { JournalEntryRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

const TODAY = (() => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
})();

function formatDayLabel(iso: string): { weekday: string; date: string; isToday: boolean } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "long" })
    .format(date)
    .toLowerCase();
  const dateLabel = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "long",
  })
    .format(date)
    .toLowerCase();
  return { weekday, date: dateLabel, isToday: iso === TODAY };
}

function preview(content: string | null): string {
  if (!content) return "";
  // Strip simple markdown markers for the card preview — full
  // rendering happens in the dialog.
  return content
    .replace(/[#*_`>~]+/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim()
    .slice(0, 140);
}

/**
 * Notion-style gallery card for a journal entry. Cover on top, date +
 * mood + preview below. The whole card is clickable (opens the
 * editor dialog).
 */
export function EntryCard({
  entry,
  onClick,
}: {
  entry: JournalEntryRow;
  onClick: () => void;
}) {
  const { weekday, date, isToday } = formatDayLabel(entry.entryDate);
  const mood = moodFor(entry.mood);
  const MoodIcon = mood?.icon;
  const previewText = preview(entry.content);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group border-border bg-card flex flex-col overflow-hidden rounded-xl border text-left shadow-sm transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-0.5 hover:shadow-md",
        isToday && "border-primary/40 ring-1 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "bg-muted relative aspect-[16/10] w-full overflow-hidden",
          !entry.coverUrl && "bg-gradient-to-br from-muted to-muted/40",
        )}
      >
        {entry.coverUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={entry.coverUrl}
            alt={entry.coverAlt ?? ""}
            loading="lazy"
            decoding="async"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="text-muted-foreground/40 flex size-full items-center justify-center">
            <CalendarRange aria-hidden className="size-8" strokeWidth={1.2} />
          </div>
        )}
        {MoodIcon && (
          <span
            className={cn(
              "bg-background/85 absolute top-2 right-2 inline-flex size-7 items-center justify-center rounded-full backdrop-blur-sm",
            )}
            title={mood?.label}
          >
            <MoodIcon
              aria-hidden
              strokeWidth={1.6}
              className={cn("size-3.5", mood?.color)}
            />
          </span>
        )}
      </div>
      <div className="flex flex-col gap-1.5 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-foreground text-[13.5px] font-medium tracking-tight">
            {date}
          </span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.14em] uppercase">
            {isToday ? "hoje" : weekday}
          </span>
        </div>
        {previewText && (
          <p className="text-muted-foreground line-clamp-2 text-[12.5px] leading-relaxed">
            {previewText}
          </p>
        )}
      </div>
    </button>
  );
}

"use client";

import { CalendarRange, Heart } from "lucide-react";

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
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(date).toLowerCase();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
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
export function EntryCard({ entry, onClick }: { entry: JournalEntryRow; onClick: () => void }) {
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
        isToday && "border-primary/40 ring-primary/20 ring-1",
      )}
    >
      <div
        className={cn(
          "bg-muted relative aspect-[16/10] w-full overflow-hidden",
          !entry.coverUrl && "from-muted to-muted/40 bg-gradient-to-br",
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
      </div>
      <div className="flex flex-col gap-2 px-4 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-foreground text-[13.5px] font-medium tracking-tight">{date}</span>
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.14em] uppercase">
            {isToday ? "today" : weekday}
          </span>
        </div>
        {mood && MoodIcon && (
          <span
            title={mood.label}
            className="border-border bg-muted/30 inline-flex w-fit items-center gap-1.5 rounded-full border px-2 py-0.5"
          >
            <MoodIcon aria-hidden strokeWidth={1.6} className={cn("size-3", mood.color)} />
            <span className={cn("font-mono text-[10px] tracking-[0.14em] uppercase", mood.color)}>
              {mood.label}
            </span>
          </span>
        )}
        {entry.gratitude && entry.gratitude.length > 0 && (
          <ul className="flex flex-col gap-1">
            {entry.gratitude.slice(0, 3).map((item, idx) => (
              <li
                key={idx}
                className="text-foreground/80 flex items-start gap-1.5 text-[12px] leading-snug"
              >
                <Heart
                  aria-hidden
                  className="text-accent fill-accent mt-[3px] size-2.5 shrink-0"
                  strokeWidth={1.5}
                />
                <span className="line-clamp-1">{item}</span>
              </li>
            ))}
            {entry.gratitude.length > 3 && (
              <li className="text-muted-foreground/60 ml-4 font-mono text-[10px] tracking-wider">
                +{entry.gratitude.length - 3} mais
              </li>
            )}
          </ul>
        )}
        {previewText && (
          <p className="text-muted-foreground line-clamp-2 text-[12.5px] leading-relaxed">
            {previewText}
          </p>
        )}
      </div>
    </button>
  );
}

"use client";

import {
  BookOpen,
  CalendarPlus,
  NotebookPen,
  Plus,
  Quote as QuoteIcon,
} from "lucide-react";
import { useMemo, useState } from "react";

import { EditorialHero } from "@/components/dashboard/editorial-hero";
import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { moodFor } from "@/lib/journal/mood";
import type { JournalEntryRow, JournalQuoteRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

import { EntryCard } from "./entry-card";
import { EntryFormDialog } from "./entry-form-dialog";
import { QuoteFormDialog } from "./quote-form-dialog";

type Props = {
  entries: JournalEntryRow[];
  quotes: JournalQuoteRow[];
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function JournalPage({ entries, quotes }: Props) {
  const [tab, setTab] = useState<"entries" | "quotes">("entries");
  // Single entry dialog driven by an "open date". Picking a card or
  // hitting "registrar hoje" both just set this to the chosen date —
  // the dialog itself decides between create/edit by looking up the
  // existing entry (if any) for that date.
  const [editorDate, setEditorDate] = useState<string | null>(null);
  const [editingQuote, setEditingQuote] = useState<JournalQuoteRow | null>(null);
  const [creatingQuote, setCreatingQuote] = useState(false);

  const today = todayIso();
  const todaysEntry = useMemo(
    () => entries.find((e) => e.entryDate === today) ?? null,
    [entries, today],
  );

  return (
    <PageShell
      title="journal"
      subtitle="reflections of the day"
      toolbar={
        tab === "entries" ? (
          <Button size="sm" onClick={() => setEditorDate(today)}>
            <CalendarPlus aria-hidden className="size-3.5" strokeWidth={1.8} />
            {todaysEntry ? "view today" : "log day"}
          </Button>
        ) : (
          <Button size="sm" onClick={() => setCreatingQuote(true)}>
            <Plus aria-hidden className="size-3.5" strokeWidth={1.8} />
            new quote
          </Button>
        )
      }
    >
      <EditorialHero
        caption="today"
        title="journal"
        accent="reflect"
        subtitle="what stayed from today"
        tone="aqua"
      />

      <div className="flex flex-col gap-5 px-3 py-3 sm:px-4 sm:py-4">
        {/* Tabs */}
        <div className="border-border-strong text-muted-foreground inline-flex h-9 w-fit items-center gap-0 overflow-hidden rounded-lg border text-[12px]">
          <button
            type="button"
            onClick={() => setTab("entries")}
            className={cn(
              "inline-flex h-full items-center gap-1.5 px-3 transition-colors",
              tab === "entries"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <NotebookPen aria-hidden className="size-3.5" strokeWidth={1.6} />
            entradas
          </button>
          <button
            type="button"
            onClick={() => setTab("quotes")}
            className={cn(
              "inline-flex h-full items-center gap-1.5 px-3 transition-colors",
              tab === "quotes"
                ? "bg-muted text-foreground"
                : "hover:bg-muted/40 hover:text-foreground",
            )}
          >
            <QuoteIcon aria-hidden className="size-3.5" strokeWidth={1.6} />
            frases
          </button>
        </div>

        {tab === "entries" ? (
          <EntriesView
            entries={entries}
            onPick={(e) => setEditorDate(e.entryDate)}
          />
        ) : (
          <QuotesView quotes={quotes} onPick={setEditingQuote} />
        )}
      </div>

      {/* Single entry dialog — its `initialDate` drives the form. */}
      <EntryFormDialog
        open={editorDate !== null}
        onOpenChange={(open) => {
          if (!open) setEditorDate(null);
        }}
        entries={entries}
        initialDate={editorDate ?? today}
      />
      <QuoteFormDialog
        open={creatingQuote}
        onOpenChange={(open) => {
          if (!open) setCreatingQuote(false);
        }}
      />
      <QuoteFormDialog
        open={!!editingQuote}
        onOpenChange={(open) => {
          if (!open) setEditingQuote(null);
        }}
        quote={editingQuote}
      />
    </PageShell>
  );
}

function EntriesView({
  entries,
  onPick,
}: {
  entries: JournalEntryRow[];
  onPick: (e: JournalEntryRow) => void;
}) {
  if (entries.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 px-6 text-center">
        <BookOpen
          className="text-muted-foreground/40 size-10"
          strokeWidth={1}
          aria-hidden
        />
        <p className="text-foreground text-[14px]">nothing logged yet</p>
        <p className="text-muted-foreground/70 max-w-sm text-[12.5px] leading-relaxed">
          at the end of the day, write down how it went — mood, cover, reflection. over
          time it becomes an archive of your days.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {entries.map((entry) => (
        <EntryCard key={entry.id} entry={entry} onClick={() => onPick(entry)} />
      ))}
    </div>
  );
}

function QuotesView({
  quotes,
  onPick,
}: {
  quotes: JournalQuoteRow[];
  onPick: (q: JournalQuoteRow) => void;
}) {
  if (quotes.length === 0) {
    return (
      <div className="flex h-[280px] flex-col items-center justify-center gap-2 px-6 text-center">
        <QuoteIcon
          className="text-muted-foreground/40 size-10"
          strokeWidth={1}
          aria-hidden
        />
        <p className="text-foreground text-[14px]">no quotes saved</p>
        <p className="text-muted-foreground/70 max-w-sm text-[12.5px] leading-relaxed">
          save quotes from books, conversations, and stray reflections to
          revisit later.
        </p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {quotes.map((q) => (
        <QuoteCard key={q.id} quote={q} onClick={() => onPick(q)} />
      ))}
    </div>
  );
}

function QuoteCard({
  quote,
  onClick,
}: {
  quote: JournalQuoteRow;
  onClick: () => void;
}) {
  const dateLabel = (() => {
    const [y, m, d] = quote.collectedOn.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
      .format(new Date(y, m - 1, d))
      .toLowerCase();
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group border-border bg-card relative flex flex-col gap-3 overflow-hidden rounded-xl border p-5 text-left shadow-sm transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)] hover:-translate-y-0.5 hover:shadow-md"
    >
      <QuoteIcon
        aria-hidden
        className="text-primary/20 absolute -top-2 -right-2 size-12"
        strokeWidth={1}
      />
      <p className="text-foreground/90 relative text-[14px] leading-relaxed italic">
        {quote.text}
      </p>
      <div className="border-border/60 mt-auto flex items-baseline justify-between gap-2 border-t pt-2">
        <span className="text-muted-foreground/85 truncate text-[12px]">
          {quote.author ? `— ${quote.author}` : "— anonymous"}
          {quote.source && (
            <span className="text-muted-foreground/60 ml-1.5 font-mono text-[10px] tracking-wider">
              · {quote.source}
            </span>
          )}
        </span>
        <span className="text-muted-foreground/60 shrink-0 font-mono text-[10px] tracking-wider">
          {dateLabel}
        </span>
      </div>
    </button>
  );
}

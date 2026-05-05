"use client";

import { Eye, Pencil, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { CoverPicker, type EntryCover } from "@/components/journal/cover-picker";
import { GratitudeList } from "@/components/journal/gratitude-list";
import { MarkdownContent } from "@/components/journal/markdown-content";
import { MarkdownEditor } from "@/components/journal/markdown-editor";
import { MoodPicker } from "@/components/journal/mood-picker";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteJournalEntry, saveJournalEntry } from "@/lib/actions/journal";
import { moodFor, type MoodLevel } from "@/lib/journal/mood";
import type { JournalEntryRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** All existing entries — used to load the entry for whichever date
   *  the user selects (so changing the date in the picker swaps the
   *  form into edit mode for that day). */
  entries: JournalEntryRow[];
  /** Date to open the dialog on (ISO yyyy-mm-dd). Defaults to today. */
  initialDate: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .toLowerCase();
}

function rowToCover(entry: JournalEntryRow | null | undefined): EntryCover | null {
  if (!entry?.coverUrl) return null;
  return {
    url: entry.coverUrl,
    thumbUrl: entry.coverThumbUrl ?? entry.coverUrl,
    alt: entry.coverAlt,
    photographerName: entry.coverPhotographerName ?? "—",
    photographerUrl: entry.coverPhotographerUrl ?? "#",
    unsplashId: entry.coverUnsplashId ?? "",
  };
}

export function EntryFormDialog({ open, onOpenChange, entries, initialDate }: Props) {
  const router = useRouter();

  const today = todayIso();
  const entriesByDate = useMemo(() => new Map(entries.map((e) => [e.entryDate, e])), [entries]);

  // The "current date being edited" — driven by the date input. When
  // the user picks a new date, we look up its entry (if any) and load
  // its values into the form below.
  const [date, setDate] = useState<string>(initialDate);
  const currentEntry = entriesByDate.get(date) ?? null;
  const isEditing = !!currentEntry;

  const [title, setTitle] = useState<string>("");
  const [mood, setMood] = useState<MoodLevel | null>(null);
  const [gratitude, setGratitude] = useState<string[]>([]);
  const [content, setContent] = useState<string>("");
  const [cover, setCover] = useState<EntryCover | null>(null);
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Reset the date when the dialog opens with a new initialDate.
  useEffect(() => {
    if (!open) return;
    setDate(initialDate);
  }, [open, initialDate]);

  // Sync the form fields whenever the active date changes (loading the
  // existing entry, or clearing the form for a blank day).
  useEffect(() => {
    if (!open) return;
    setTitle(currentEntry?.title ?? "");
    setMood((currentEntry?.mood as MoodLevel | null | undefined) ?? null);
    setGratitude(currentEntry?.gratitude ?? []);
    setContent(currentEntry?.content ?? "");
    setCover(rowToCover(currentEntry));
    setTab("edit");
    setError(null);
    // Intentionally only depend on `date` + `entriesByDate` — including
    // `currentEntry` directly would create churn when its identity
    // changes after a save round-trip.
  }, [open, date, entriesByDate]);

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      const result = await saveJournalEntry({
        entryDate: date,
        title: title || null,
        mood,
        gratitude,
        content,
        coverUrl: cover?.url ?? null,
        coverThumbUrl: cover?.thumbUrl ?? null,
        coverAlt: cover?.alt ?? null,
        coverPhotographerName: cover?.photographerName ?? null,
        coverPhotographerUrl: cover?.photographerUrl ?? null,
        coverUnsplashId: cover?.unsplashId ?? null,
      });
      if (result.ok) {
        toast.success(isEditing ? "entry updated." : "entry logged.");
        router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    startDeleteTransition(async () => {
      const result = await deleteJournalEntry(date);
      if (result.ok) {
        toast.success("entry deleted.");
        router.refresh();
        setConfirmDelete(false);
        onOpenChange(false);
      } else {
        toast.error(result.error);
        setConfirmDelete(false);
      }
    });
  }

  const moodDescriptor = moodFor(mood);
  const isFutureDate = date > today;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-[20px] leading-tight font-light tracking-tight italic">
              {isEditing ? "edit entry" : "log day"}
            </DialogTitle>
            <DialogDescription className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
              {formatDateLong(date)}
              {date === today && " · today"}
              {isEditing && date !== today && " · already logged"}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <Field>
              <FieldLabel htmlFor="entry-date">date</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="entry-date"
                  type="date"
                  value={date}
                  max={today}
                  onChange={(e) => setDate(e.target.value || today)}
                  disabled={isSaving}
                  className="h-9 w-[200px]"
                />
                <button
                  type="button"
                  onClick={() => setDate(today)}
                  disabled={isSaving || date === today}
                  className="text-muted-foreground hover:text-foreground text-[11.5px] underline-offset-2 hover:underline disabled:opacity-40"
                >
                  today
                </button>
              </div>
              {isFutureDate ? (
                <span className="text-destructive text-[11.5px]">
                  can&apos;t log the future — pick today or an earlier day.
                </span>
              ) : isEditing ? (
                <span className="text-muted-foreground/70 text-[11.5px]">
                  this day already has an entry — you&apos;re editing it.
                </span>
              ) : (
                <span className="text-muted-foreground/70 text-[11.5px]">
                  you can log any past day too.
                </span>
              )}
            </Field>

            <CoverPicker value={cover} onChange={setCover} disabled={isSaving} />

            <Field>
              <FieldLabel htmlFor="entry-title">title</FieldLabel>
              <Input
                id="entry-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSaving}
                placeholder="e.g. 04 de maio, ameno"
                maxLength={120}
              />
              <span className="text-muted-foreground/70 text-[11.5px]">
                a short phrase that captures the feel of the day. optional.
              </span>
            </Field>

            <Field>
              <FieldLabel>how was the day?</FieldLabel>
              <MoodPicker value={mood} onChange={setMood} disabled={isSaving} />
              {moodDescriptor && (
                <span className="text-muted-foreground/70 text-[11.5px]">
                  this day was marked as{" "}
                  <span className="text-foreground font-medium">{moodDescriptor.label}</span>.
                </span>
              )}
            </Field>

            <Field>
              <FieldLabel>three things to be grateful for</FieldLabel>
              <GratitudeList value={gratitude} onChange={setGratitude} disabled={isSaving} />
              <span className="text-muted-foreground/70 text-[11.5px]">
                small, medium, big — what matters is to stop and look.
              </span>
            </Field>

            <Field>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel>reflection</FieldLabel>
                <div className="border-border-strong text-muted-foreground inline-flex h-7 items-center gap-0 overflow-hidden rounded-md border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTab("edit")}
                    className={cn(
                      "inline-flex h-full items-center gap-1 px-2.5 transition-colors",
                      tab === "edit" ? "bg-muted text-foreground" : "hover:text-foreground",
                    )}
                  >
                    <Pencil aria-hidden className="size-3" strokeWidth={1.7} />
                    edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("preview")}
                    className={cn(
                      "inline-flex h-full items-center gap-1 px-2.5 transition-colors",
                      tab === "preview" ? "bg-muted text-foreground" : "hover:text-foreground",
                    )}
                  >
                    <Eye aria-hidden className="size-3" strokeWidth={1.7} />
                    preview
                  </button>
                </div>
              </div>
              {tab === "edit" ? (
                <MarkdownEditor
                  value={content}
                  onChange={setContent}
                  disabled={isSaving}
                  rows={10}
                  placeholder="what stayed from this day? select a passage and use the buttons — or Ctrl+B / Ctrl+I."
                />
              ) : (
                <div className="border-input bg-muted/10 min-h-[200px] w-full rounded-md border px-4 py-3">
                  {content.trim().length === 0 ? (
                    <span className="text-muted-foreground/60 text-[13px] italic">
                      nothing to show yet — write something in the edit tab.
                    </span>
                  ) : (
                    <MarkdownContent source={content} />
                  )}
                </div>
              )}
              <span className="text-muted-foreground/60 text-[11px]">
                markdown supported: **bold**, *italic*, lists, links, &gt; quote, # headings.
              </span>
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </div>

          <DialogFooter className="flex items-center gap-2">
            {isEditing && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setConfirmDelete(true)}
                disabled={isSaving || isDeleting}
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 mr-auto"
              >
                <Trash2 aria-hidden className="size-3.5" />
                delete
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || isFutureDate}>
              <Save aria-hidden className="size-3.5" />
              {isSaving ? "saving…" : isEditing ? "save" : "log"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              the entry from {formatDateLong(date)} will be gone forever. are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? "deleting…" : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

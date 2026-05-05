"use client";

import { Heart, Pencil, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { MarkdownContent } from "@/components/journal/markdown-content";
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
import { deleteJournalEntry } from "@/lib/actions/journal";
import { moodFor } from "@/lib/journal/mood";
import type { JournalEntryRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

type Props = {
  entry: JournalEntryRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: () => void;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

export function EntryViewDialog({ entry, open, onOpenChange, onEdit }: Props) {
  const router = useRouter();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isDeleting, startDeleteTransition] = useTransition();

  const today = todayIso();

  function handleDelete() {
    if (!entry) return;
    startDeleteTransition(async () => {
      const result = await deleteJournalEntry(entry.entryDate);
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

  if (!entry) return null;

  const mood = moodFor(entry.mood);
  const MoodIcon = mood?.icon;
  const hasContent = entry.content && entry.content.trim().length > 0;
  const hasGratitude = entry.gratitude && entry.gratitude.length > 0;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-2xl">
          {entry.coverUrl && (
            <div className="relative h-52 w-full shrink-0 overflow-hidden rounded-t-lg">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={entry.coverUrl}
                alt={entry.coverAlt ?? ""}
                className="size-full object-cover"
              />
              {entry.coverPhotographerName && (
                <span className="absolute right-3 bottom-2 rounded bg-black/40 px-1.5 py-0.5 font-mono text-[9px] tracking-wide text-white/80">
                  photo by{" "}
                  {entry.coverPhotographerUrl ? (
                    <a
                      href={entry.coverPhotographerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2"
                    >
                      {entry.coverPhotographerName}
                    </a>
                  ) : (
                    entry.coverPhotographerName
                  )}{" "}
                  / Unsplash
                </span>
              )}
            </div>
          )}

          <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-8 pb-6">
            <DialogHeader>
              <DialogTitle className="font-display text-[20px] leading-tight font-semibold tracking-tight">
                {entry.title ?? formatDateLong(entry.entryDate)}
              </DialogTitle>
              <DialogDescription className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
                {formatDateLong(entry.entryDate)}
                {entry.entryDate === today ? " · today" : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-5 flex flex-col gap-5">
              {mood && MoodIcon && (
                <span
                  className={cn(
                    "border-border bg-muted/30 inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1",
                  )}
                >
                  <MoodIcon aria-hidden strokeWidth={1.6} className={cn("size-3.5", mood.color)} />
                  <span
                    className={cn("font-mono text-[11px] tracking-[0.14em] uppercase", mood.color)}
                  >
                    {mood.label}
                  </span>
                </span>
              )}

              {hasGratitude && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-muted-foreground/60 font-mono text-[10.5px] tracking-[0.16em] uppercase">
                    gratitude
                  </p>
                  <ul className="flex flex-col gap-2">
                    {entry.gratitude!.map((item, idx) => (
                      <li
                        key={idx}
                        className="text-foreground/85 flex items-start gap-2 text-[13px] leading-snug"
                      >
                        <Heart
                          aria-hidden
                          className="text-accent fill-accent mt-[3px] size-3 shrink-0"
                          strokeWidth={1.5}
                        />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {hasContent && (
                <div className="flex flex-col gap-2.5">
                  <p className="text-muted-foreground/60 font-mono text-[10.5px] tracking-[0.16em] uppercase">
                    reflection
                  </p>
                  <div className="bg-muted/10 rounded-md px-4 py-3">
                    <MarkdownContent source={entry.content!} />
                  </div>
                </div>
              )}

              {!mood && !hasGratitude && !hasContent && (
                <p className="text-muted-foreground/60 text-[13px] italic">
                  nothing written for this day yet.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="border-border flex shrink-0 items-center gap-3 border-t px-6 pt-3 pb-5">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmDelete(true)}
              disabled={isDeleting}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10 mr-auto px-4"
            >
              <Trash2 aria-hidden className="size-3.5" />
              delete
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="px-4"
            >
              close
            </Button>
            <Button type="button" onClick={onEdit} className="px-5">
              <Pencil aria-hidden className="size-3.5" />
              edit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              the entry from {formatDateLong(entry.entryDate)} will be gone forever. are you sure?
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

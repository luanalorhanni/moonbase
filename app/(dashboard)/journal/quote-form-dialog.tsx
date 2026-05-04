"use client";

import { Quote, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { deleteJournalQuote, saveJournalQuote } from "@/lib/actions/journal";
import type { JournalQuoteRow } from "@/lib/queries/journal";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quote?: JournalQuoteRow | null;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function QuoteFormDialog({ open, onOpenChange, quote }: Props) {
  const router = useRouter();
  const isEdit = !!quote;

  const [text, setText] = useState(quote?.text ?? "");
  const [author, setAuthor] = useState(quote?.author ?? "");
  const [source, setSource] = useState(quote?.source ?? "");
  const [collectedOn, setCollectedOn] = useState(quote?.collectedOn ?? todayIso());
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    setText(quote?.text ?? "");
    setAuthor(quote?.author ?? "");
    setSource(quote?.source ?? "");
    setCollectedOn(quote?.collectedOn ?? todayIso());
    setError(null);
  }, [open, quote]);

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      const result = await saveJournalQuote({
        id: quote?.id ?? null,
        text,
        author,
        source,
        collectedOn,
      });
      if (result.ok) {
        toast.success(isEdit ? "quote updated." : "quote saved.");
        router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (!quote) return;
    startDeleteTransition(async () => {
      const result = await deleteJournalQuote(quote.id);
      if (result.ok) {
        toast.success("quote deleted.");
        router.refresh();
        setConfirmDelete(false);
        onOpenChange(false);
      } else {
        toast.error(result.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Quote aria-hidden className="size-4" strokeWidth={1.6} />
              {isEdit ? "edit quote" : "new quote"}
            </DialogTitle>
            <DialogDescription>a quote or reflection to keep.</DialogDescription>
          </DialogHeader>

          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel htmlFor="quote-text">quote</FieldLabel>
              <textarea
                id="quote-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={isSaving}
                rows={4}
                autoFocus
                placeholder="what stayed?"
                className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:ring-ring min-h-[80px] w-full resize-y rounded-md border px-3 py-2 text-[13px] leading-relaxed italic transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
              />
            </Field>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="quote-author">author</FieldLabel>
                <Input
                  id="quote-author"
                  value={author}
                  onChange={(e) => setAuthor(e.target.value)}
                  disabled={isSaving}
                  placeholder="optional"
                  className="h-9"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="quote-source">source</FieldLabel>
                <Input
                  id="quote-source"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  disabled={isSaving}
                  placeholder="book, conversation…"
                  className="h-9"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="quote-date">saved on</FieldLabel>
              <Input
                id="quote-date"
                type="date"
                value={collectedOn}
                onChange={(e) => setCollectedOn(e.target.value)}
                disabled={isSaving}
                className="h-9"
              />
            </Field>
            {error && <FieldError>{error}</FieldError>}
          </FieldGroup>

          <DialogFooter className="flex items-center gap-2">
            {isEdit && (
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
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving || text.trim().length === 0}
            >
              <Save aria-hidden className="size-3.5" />
              {isSaving ? "saving…" : "save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete this quote?</AlertDialogTitle>
            <AlertDialogDescription>
              the quote disappears from your collection. this can't be undone.
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

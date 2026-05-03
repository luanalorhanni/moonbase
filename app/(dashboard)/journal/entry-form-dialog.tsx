"use client";

import { Eye, Pencil, Save, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { CoverPicker, type EntryCover } from "@/components/journal/cover-picker";
import { MarkdownContent } from "@/components/journal/markdown-content";
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
import { deleteJournalEntry, saveJournalEntry } from "@/lib/actions/journal";
import { moodFor, type MoodLevel } from "@/lib/journal/mood";
import type { JournalEntryRow } from "@/lib/queries/journal";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When provided we're editing this entry; otherwise a brand-new
   *  entry for `defaultDate` (or today). */
  entry?: JournalEntryRow | null;
  /** Pre-fill date (ISO yyyy-mm-dd). Ignored when `entry` is set. */
  defaultDate?: string;
};

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDateLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return new Intl.DateTimeFormat("pt-BR", {
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

export function EntryFormDialog({ open, onOpenChange, entry, defaultDate }: Props) {
  const router = useRouter();
  const isEdit = !!entry;
  const initialDate = entry?.entryDate ?? defaultDate ?? todayIso();

  const [date] = useState<string>(initialDate);
  const [mood, setMood] = useState<MoodLevel | null>(
    (entry?.mood as MoodLevel | null | undefined) ?? null,
  );
  const [content, setContent] = useState<string>(entry?.content ?? "");
  const [cover, setCover] = useState<EntryCover | null>(rowToCover(entry));
  const [tab, setTab] = useState<"edit" | "preview">("edit");
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Reset state every time the dialog opens with a different entry.
  useEffect(() => {
    if (!open) return;
    setMood((entry?.mood as MoodLevel | null | undefined) ?? null);
    setContent(entry?.content ?? "");
    setCover(rowToCover(entry));
    setTab("edit");
    setError(null);
  }, [open, entry]);

  function handleSave() {
    setError(null);
    startSaveTransition(async () => {
      const result = await saveJournalEntry({
        entryDate: date,
        mood,
        content,
        coverUrl: cover?.url ?? null,
        coverThumbUrl: cover?.thumbUrl ?? null,
        coverAlt: cover?.alt ?? null,
        coverPhotographerName: cover?.photographerName ?? null,
        coverPhotographerUrl: cover?.photographerUrl ?? null,
        coverUnsplashId: cover?.unsplashId ?? null,
      });
      if (result.ok) {
        toast.success(isEdit ? "entrada atualizada." : "entrada registrada.");
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
        toast.success("entrada excluída.");
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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-[20px] leading-tight font-light italic tracking-tight">
              {isEdit ? "editar entrada" : "registrar hoje"}
            </DialogTitle>
            <DialogDescription className="font-mono text-[10.5px] tracking-[0.14em] uppercase">
              {formatDateLong(date)}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-5">
            <CoverPicker value={cover} onChange={setCover} disabled={isSaving} />

            <Field>
              <FieldLabel>como foi hoje?</FieldLabel>
              <MoodPicker value={mood} onChange={setMood} disabled={isSaving} />
              {moodDescriptor && (
                <span className="text-muted-foreground/70 text-[11.5px]">
                  você marcou esse dia como{" "}
                  <span className="text-foreground font-medium">{moodDescriptor.label}</span>.
                </span>
              )}
            </Field>

            <Field>
              <div className="flex items-baseline justify-between gap-3">
                <FieldLabel>reflexão</FieldLabel>
                <div className="border-border-strong text-muted-foreground inline-flex h-7 items-center gap-0 overflow-hidden rounded-md border text-[11px]">
                  <button
                    type="button"
                    onClick={() => setTab("edit")}
                    className={cn(
                      "inline-flex h-full items-center gap-1 px-2.5 transition-colors",
                      tab === "edit"
                        ? "bg-muted text-foreground"
                        : "hover:text-foreground",
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
                      tab === "preview"
                        ? "bg-muted text-foreground"
                        : "hover:text-foreground",
                    )}
                  >
                    <Eye aria-hidden className="size-3" strokeWidth={1.7} />
                    preview
                  </button>
                </div>
              </div>
              {tab === "edit" ? (
                <textarea
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  disabled={isSaving}
                  rows={10}
                  placeholder="**negrito**, *itálico*, listas com - ou 1., links com [texto](url)…"
                  className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:ring-ring min-h-[200px] w-full resize-y rounded-md border px-3 py-2 font-sans text-[13px] leading-relaxed transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                />
              ) : (
                <div className="border-input bg-muted/10 min-h-[200px] w-full rounded-md border px-4 py-3">
                  {content.trim().length === 0 ? (
                    <span className="text-muted-foreground/60 text-[13px] italic">
                      nada pra mostrar ainda — escreva algo na aba edit.
                    </span>
                  ) : (
                    <MarkdownContent source={content} />
                  )}
                </div>
              )}
              <span className="text-muted-foreground/60 text-[11px]">
                markdown suportado: **negrito**, *itálico*, listas, links, &gt; citação, # cabeçalhos.
              </span>
            </Field>

            {error && <FieldError>{error}</FieldError>}
          </div>

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
                excluir
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              cancelar
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving}>
              <Save aria-hidden className="size-3.5" />
              {isSaving ? "salvando…" : isEdit ? "salvar" : "registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>excluir esta entrada?</AlertDialogTitle>
            <AlertDialogDescription>
              o registro de {formatDateLong(date)} vai sumir pra sempre. tem certeza?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancelar</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? "excluindo…" : "excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

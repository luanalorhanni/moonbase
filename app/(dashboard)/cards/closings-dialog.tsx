"use client";

import { CalendarClock, ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { saveCardClosings, type ClosingOverrideInput } from "@/lib/actions/card-closings";
import type { CardRow, CardClosingRow } from "@/lib/queries/cards";
import { cn } from "@/lib/utils";

const EN_MONTH_LONG = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function monthRefStr(year: number, month0: number): string {
  return `${year}-${pad(month0 + 1)}-01`;
}

function parseRef(ref: string): { year: number; month0: number } {
  const [y, m] = ref.split("-").map(Number);
  return { year: y, month0: m - 1 };
}

function shift(ref: string, deltaMonths: number): string {
  const { year, month0 } = parseRef(ref);
  const total = year * 12 + month0 + deltaMonths;
  return monthRefStr(Math.floor(total / 12), ((total % 12) + 12) % 12);
}

function currentMonthRef(): string {
  const d = new Date();
  return monthRefStr(d.getFullYear(), d.getMonth());
}

function formatLong(ref: string): string {
  const { year, month0 } = parseRef(ref);
  return `${EN_MONTH_LONG[month0]} ${year}`;
}

const PAST_MONTHS = 6;
const FUTURE_MONTHS = 12;

type Row = {
  ref: string;
  /** Effective values that apply to this month (from explicit override or carry-forward). */
  effectiveClosing: number;
  effectiveDue: number | null;
  /** Explicit override values for THIS month, if any. */
  override: { closingDay: number; dueDay: number | null } | null;
  /** True when the override is the user's edit and not yet saved. */
  dirty: boolean;
  /** Local form values shown in the inputs. Empty = "no override". */
  closingInput: string;
  dueInput: string;
};

function findCarryForward(
  ref: string,
  closings: { referenceMonth: string; closingDay: number; dueDay: number | null }[],
): { closingDay: number; dueDay: number | null } | null {
  let best: { ref: string; closingDay: number; dueDay: number | null } | null = null;
  for (const c of closings) {
    if (c.referenceMonth > ref) continue;
    if (!best || c.referenceMonth > best.ref) {
      best = { ref: c.referenceMonth, closingDay: c.closingDay, dueDay: c.dueDay };
    }
  }
  return best ? { closingDay: best.closingDay, dueDay: best.dueDay } : null;
}

function findCarryForwardDue(
  ref: string,
  closings: { referenceMonth: string; dueDay: number | null }[],
): number | null {
  let best: { ref: string; dueDay: number } | null = null;
  for (const c of closings) {
    if (c.referenceMonth > ref) continue;
    if (c.dueDay == null) continue;
    if (!best || c.referenceMonth > best.ref) {
      best = { ref: c.referenceMonth, dueDay: c.dueDay };
    }
  }
  return best ? best.dueDay : null;
}

export function CardClosingsDialog({
  card,
  closings,
  open,
  onOpenChange,
}: {
  card: CardRow;
  closings: CardClosingRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const [isSaving, startSaveTransition] = useTransition();

  // Build the visible window: PAST_MONTHS before current up to FUTURE_MONTHS
  // ahead. The user can still scroll the window with the chevron buttons.
  const initialAnchor = currentMonthRef();
  const [anchor, setAnchor] = useState(initialAnchor);

  // Local edits: keyed by ref. `null` = explicit "remove override".
  const [edits, setEdits] = useState<Map<string, { closingDay: number | null; dueDay: number | null }>>(
    () => new Map(),
  );

  const closingsAsRef = useMemo(
    () => closings.map((c) => ({ ...c, referenceMonth: c.referenceMonth })),
    [closings],
  );

  const rows: Row[] = useMemo(() => {
    const list: Row[] = [];
    for (let i = -PAST_MONTHS; i <= FUTURE_MONTHS; i++) {
      const ref = shift(anchor, i);
      const explicit = closingsAsRef.find((c) => c.referenceMonth === ref) ?? null;
      const edit = edits.get(ref);

      // Effective values come from carry-forward in the persisted set.
      const carry = findCarryForward(ref, closingsAsRef);
      const carryDue = findCarryForwardDue(ref, closingsAsRef);
      const effectiveClosing = carry?.closingDay ?? card.defaultClosingDay ?? 0;
      const effectiveDue = carryDue ?? card.dueDay ?? null;

      // Form inputs: edit > explicit > empty (means "no override here").
      let closingInput = "";
      let dueInput = "";
      let dirty = false;
      let override: { closingDay: number; dueDay: number | null } | null = null;

      if (edit) {
        dirty = true;
        if (edit.closingDay !== null) {
          closingInput = String(edit.closingDay);
          override = { closingDay: edit.closingDay, dueDay: edit.dueDay };
        }
        if (edit.dueDay !== null) dueInput = String(edit.dueDay);
      } else if (explicit) {
        closingInput = String(explicit.closingDay);
        if (explicit.dueDay !== null) dueInput = String(explicit.dueDay);
        override = { closingDay: explicit.closingDay, dueDay: explicit.dueDay };
      }

      list.push({
        ref,
        effectiveClosing,
        effectiveDue,
        override,
        dirty,
        closingInput,
        dueInput,
      });
    }
    return list;
  }, [anchor, closingsAsRef, edits, card.defaultClosingDay, card.dueDay]);

  function setEditField(ref: string, field: "closing" | "due", raw: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      const current = next.get(ref) ?? { closingDay: null, dueDay: null };
      const explicit = closingsAsRef.find((c) => c.referenceMonth === ref) ?? null;
      const trimmed = raw.trim();
      const num = trimmed === "" ? null : Number(trimmed);
      if (num !== null && (!Number.isInteger(num) || num < 1 || num > 31)) {
        // Ignore — invalid input, the form will block save.
      }
      const updated = { ...current };
      if (field === "closing") {
        updated.closingDay = num;
        // If we just cleared closing day and there's no explicit row to
        // delete (i.e. nothing was saved here), clear the dirty edit.
        if (num === null && updated.dueDay === null && !explicit) {
          next.delete(ref);
          return next;
        }
      } else {
        updated.dueDay = num;
      }
      next.set(ref, updated);
      return next;
    });
  }

  function clearEdit(ref: string) {
    setEdits((prev) => {
      const next = new Map(prev);
      next.delete(ref);
      return next;
    });
  }

  function clearOverride(ref: string) {
    // Mark as "delete override" — closingDay null and dueDay null with explicit edit.
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(ref, { closingDay: null, dueDay: null });
      return next;
    });
  }

  function buildPayload(): ClosingOverrideInput[] {
    const payload: ClosingOverrideInput[] = [];
    for (const [ref, edit] of edits) {
      const explicit = closingsAsRef.find((c) => c.referenceMonth === ref) ?? null;
      // closingDay null means "no override". If there was an explicit row,
      // we want to delete it. If there wasn't, no-op.
      if (edit.closingDay === null) {
        if (explicit) payload.push({ referenceMonth: ref, closingDay: null, dueDay: null });
        continue;
      }
      payload.push({
        referenceMonth: ref,
        closingDay: edit.closingDay,
        dueDay: edit.dueDay,
      });
    }
    return payload;
  }

  function handleSave() {
    const payload = buildPayload();
    if (payload.length === 0) {
      onOpenChange(false);
      return;
    }
    // Block save if any closing override has an invalid day.
    for (const o of payload) {
      if (o.closingDay !== null && (o.closingDay < 1 || o.closingDay > 31)) {
        toast.error(`invalid closing day in ${formatLong(o.referenceMonth)}.`);
        return;
      }
      if (o.dueDay !== null && (o.dueDay < 1 || o.dueDay > 31)) {
        toast.error(`invalid due day in ${formatLong(o.referenceMonth)}.`);
        return;
      }
    }
    startSaveTransition(async () => {
      const result = await saveCardClosings(card.id, payload);
      if (result.ok) {
        toast.success("closing dates saved.");
        setEdits(new Map());
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarClock aria-hidden className="size-4" strokeWidth={1.6} />
            closing dates · {card.name}
          </DialogTitle>
          <DialogDescription>
            override the closing and due day month-by-month. months without an override carry
            forward from the most recent prior month — so you only need to set values when they
            actually change.
          </DialogDescription>
        </DialogHeader>

        {/* defaults summary */}
        <div className="border-border bg-muted/20 flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-[12px]">
          <div className="flex flex-col gap-0.5">
            <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.16em] uppercase">
              card defaults
            </span>
            <span className="text-foreground tabular-nums">
              closing {card.defaultClosingDay ?? "—"} · due {card.dueDay ?? "—"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setAnchor(shift(anchor, -6))}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
              aria-label="earlier window"
            >
              <ChevronLeft aria-hidden className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setAnchor(currentMonthRef())}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground rounded-md border px-2 py-1 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors"
            >
              today
            </button>
            <button
              type="button"
              onClick={() => setAnchor(shift(anchor, 6))}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
              aria-label="later window"
            >
              <ChevronRight aria-hidden className="size-3.5" />
            </button>
          </div>
        </div>

        {/* months grid */}
        <div className="border-border overflow-hidden rounded-md border">
          <div className="bg-muted/30 text-muted-foreground grid grid-cols-[1fr_auto_auto_auto] gap-3 border-b px-3 py-2 font-mono text-[10.5px] tracking-[0.14em] uppercase">
            <span>month</span>
            <span className="w-16 text-right">closing</span>
            <span className="w-16 text-right">due</span>
            <span className="w-7" />
          </div>
          <ul className="divide-border divide-y">
            {rows.map((r) => {
              const isCurrent = r.ref === initialAnchor;
              const inheritedClosing =
                r.closingInput === "" && r.effectiveClosing !== card.defaultClosingDay;
              return (
                <li
                  key={r.ref}
                  className={cn(
                    "grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2 transition-colors",
                    isCurrent && "bg-primary/[0.04]",
                    r.dirty && "bg-amber-500/[0.06]",
                  )}
                >
                  <div className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        "text-[13px]",
                        isCurrent ? "text-primary font-semibold" : "text-foreground",
                      )}
                    >
                      {formatLong(r.ref)}
                    </span>
                    {isCurrent && (
                      <span className="text-primary font-mono text-[9.5px] tracking-[0.14em] uppercase">
                        current
                      </span>
                    )}
                    {r.dirty && (
                      <span className="font-mono text-[9.5px] tracking-[0.14em] text-amber-600 uppercase">
                        unsaved
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    inputMode="numeric"
                    placeholder={String(r.effectiveClosing)}
                    value={r.closingInput}
                    onChange={(e) => setEditField(r.ref, "closing", e.target.value)}
                    disabled={isSaving}
                    className={cn(
                      "border-input focus-visible:border-ring focus-visible:ring-ring/40 h-8 w-16 rounded-md border bg-transparent px-2 text-right text-[13px] tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none",
                      r.closingInput === "" &&
                        inheritedClosing &&
                        "placeholder:text-amber-600/70",
                    )}
                  />
                  <input
                    type="number"
                    min={1}
                    max={31}
                    inputMode="numeric"
                    placeholder={r.effectiveDue !== null ? String(r.effectiveDue) : "—"}
                    value={r.dueInput}
                    onChange={(e) => setEditField(r.ref, "due", e.target.value)}
                    disabled={isSaving}
                    className="border-input focus-visible:border-ring focus-visible:ring-ring/40 h-8 w-16 rounded-md border bg-transparent px-2 text-right text-[13px] tabular-nums transition-colors focus-visible:ring-2 focus-visible:outline-none"
                  />
                  {r.override || r.dirty ? (
                    <button
                      type="button"
                      onClick={() => (r.dirty ? clearEdit(r.ref) : clearOverride(r.ref))}
                      disabled={isSaving}
                      className="text-muted-foreground/60 hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors"
                      aria-label={r.dirty ? "discard edits" : "remove override"}
                      title={r.dirty ? "discard edits" : "remove override (carry-forward)"}
                    >
                      <RotateCcw aria-hidden className="size-3" />
                    </button>
                  ) : (
                    <span className="size-7 shrink-0" aria-hidden />
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        <DialogFooter className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-[11.5px]">
            empty cells inherit from the most recent override above (or card defaults).
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || edits.size === 0}>
              {isSaving ? "saving..." : `save ${edits.size > 0 ? `(${edits.size})` : ""}`}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

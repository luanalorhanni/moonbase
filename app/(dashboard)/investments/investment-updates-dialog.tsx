"use client";

import { ArrowDownRight, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  deleteInvestmentUpdate,
  recordInvestmentUpdate,
} from "@/lib/actions/investment-updates";
import type {
  InvestmentKind,
  InvestmentUpdateRow,
} from "@/lib/queries/investment-updates";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  investment: {
    kind: InvestmentKind;
    id: string;
    title: string;
    bank: string;
    appliedAmount: number;
    applicationDate: string;
  } | null;
  /** All updates already loaded server-side; we filter in memory. */
  updates: InvestmentUpdateRow[];
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function InvestmentUpdatesDialog({ open, onOpenChange, investment, updates }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [recordedOn, setRecordedOn] = useState(todayIso());
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");
  const [valueError, setValueError] = useState<string | null>(null);

  // Reset the form whenever the dialog closes or switches investment.
  function reset() {
    setRecordedOn(todayIso());
    setCurrentValue("");
    setNotes("");
    setValueError(null);
  }

  const investmentUpdates = useMemo(() => {
    if (!investment) return [];
    return updates
      .filter((u) => u.investmentKind === investment.kind && u.investmentId === investment.id)
      .sort((a, b) => (a.recordedOn < b.recordedOn ? 1 : -1));
  }, [investment, updates]);

  const enriched = useMemo(() => {
    if (!investment) return [];
    // Walk newest → oldest with the prior (older) update at hand so we
    // can show "vs prior" right next to "vs applied".
    return investmentUpdates.map((u, idx) => {
      const value = Number(u.currentValue);
      const gainVsApplied = value - investment.appliedAmount;
      const prior = investmentUpdates[idx + 1];
      const gainVsPrior = prior ? value - Number(prior.currentValue) : null;
      return { row: u, value, gainVsApplied, gainVsPrior };
    });
  }, [investmentUpdates, investment]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!investment) return;
    if (!currentValue.trim()) {
      setValueError("informe o valor atual.");
      return;
    }
    startTransition(async () => {
      const result = await recordInvestmentUpdate({
        investmentKind: investment.kind,
        investmentId: investment.id,
        recordedOn,
        currentValue,
        notes: notes.trim() || null,
      });
      if (result.ok) {
        toast.success("atualização registrada.");
        reset();
        router.refresh();
      } else {
        const fieldMsg = result.fieldErrors?.currentValue?.[0];
        setValueError(fieldMsg ?? null);
        toast.error(result.error);
      }
    });
  }

  function handleDelete(updateId: string) {
    startTransition(async () => {
      const result = await deleteInvestmentUpdate(updateId);
      if (result.ok) {
        toast.success("atualização removida.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>histórico de atualizações</DialogTitle>
          <DialogDescription>
            {investment
              ? `${investment.title} · ${investment.bank} · aplicado em ${formatDate(investment.applicationDate)}`
              : null}
          </DialogDescription>
        </DialogHeader>

        {/* ── New update form ─────────────────────────────────────── */}
        <form onSubmit={handleSubmit} className="border-border bg-muted/30 rounded-lg border p-4">
          <h3 className="text-foreground mb-3 text-[12.5px] font-medium">
            registrar atualização do valor
          </h3>
          <FieldGroup>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="recordedOn">data</FieldLabel>
                <Input
                  id="recordedOn"
                  type="date"
                  value={recordedOn}
                  onChange={(e) => setRecordedOn(e.target.value)}
                  required
                />
              </Field>
              <Field data-invalid={valueError ? "" : undefined}>
                <FieldLabel htmlFor="currentValue">valor atual</FieldLabel>
                <Input
                  id="currentValue"
                  inputMode="decimal"
                  placeholder="0,00"
                  value={currentValue}
                  onChange={(e) => {
                    setCurrentValue(e.target.value);
                    if (valueError) setValueError(null);
                  }}
                  required
                />
                {valueError && (
                  <p className="text-destructive text-[11.5px]">{valueError}</p>
                )}
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="notes">notas (opcional)</FieldLabel>
              <Input
                id="notes"
                placeholder="ex: rendimento mensal, aporte, resgate parcial"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </FieldGroup>
          <div className="mt-4 flex justify-end">
            <Button type="submit" size="sm" disabled={isPending || !investment}>
              <Plus aria-hidden className="size-3.5" />
              {isPending ? "salvando..." : "registrar"}
            </Button>
          </div>
        </form>

        {/* ── History ─────────────────────────────────────────────── */}
        {investment && (
          <div className="mt-4 flex flex-col gap-2">
            <h3 className="text-muted-foreground font-mono text-[10.5px] tracking-[0.18em] uppercase">
              histórico
            </h3>
            {enriched.length === 0 ? (
              <p className="text-muted-foreground rounded-lg border border-dashed py-6 text-center text-[12.5px]">
                ainda sem atualizações registradas. cadastre a primeira acima.
              </p>
            ) : (
              <ul className="divide-border divide-y rounded-lg border">
                {enriched.map(({ row, value, gainVsApplied, gainVsPrior }) => (
                  <li
                    key={row.id}
                    className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="flex shrink-0 flex-col">
                      <span className="text-foreground font-mono text-[12.5px] tabular-nums">
                        {formatDate(row.recordedOn)}
                      </span>
                      {row.notes && (
                        <span className="text-muted-foreground text-[11.5px]">{row.notes}</span>
                      )}
                    </div>
                    <div className="flex flex-1 items-baseline gap-4 sm:justify-end">
                      <span className="numeric text-foreground text-[14px] font-semibold tabular-nums">
                        {formatBRL(value)}
                      </span>
                      <DeltaBadge label="vs aplicado" delta={gainVsApplied} />
                      {gainVsPrior != null && (
                        <DeltaBadge label="vs anterior" delta={gainVsPrior} subtle />
                      )}
                    </div>
                    <button
                      type="button"
                      aria-label="remover"
                      disabled={isPending}
                      onClick={() => handleDelete(row.id)}
                      className="text-muted-foreground/70 hover:text-destructive inline-flex size-7 items-center justify-center rounded-md transition-colors"
                    >
                      <Trash2 aria-hidden className="size-3.5" strokeWidth={1.5} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function DeltaBadge({
  label,
  delta,
  subtle,
}: {
  label: string;
  delta: number;
  subtle?: boolean;
}) {
  if (delta === 0) {
    return (
      <span className="text-muted-foreground/60 font-mono text-[11px]">
        {label} —
      </span>
    );
  }
  const positive = delta > 0;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 font-mono text-[11px] tabular-nums",
        positive ? "text-success" : "text-destructive",
        subtle && "opacity-75",
      )}
      title={label}
    >
      <span className="text-muted-foreground/70 mr-1 font-mono text-[10px]">{label}</span>
      {positive ? (
        <ArrowUpRight aria-hidden className="size-3 self-center" strokeWidth={2} />
      ) : (
        <ArrowDownRight aria-hidden className="size-3 self-center" strokeWidth={2} />
      )}
      {formatBRL(Math.abs(delta))}
    </span>
  );
}

"use client";

import { Archive, Camera, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { deleteMonthlySnapshot, upsertMonthlySnapshot } from "@/lib/actions/snapshots";
import { currentMonthRef, isMonthRef } from "@/lib/finance/month";
import { previousMonthRef } from "@/lib/finance/snapshots";
import { type SnapshotRow } from "@/lib/queries/snapshots";
import { cn, formatBRL } from "@/lib/utils";

export function SnapshotsView({ snapshots }: { snapshots: SnapshotRow[] }) {
  const [reference, setReference] = useState(previousMonthRef());
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<SnapshotRow | null>(null);

  function handleGenerate() {
    if (!isMonthRef(reference)) {
      toast.error("Mês inválido. Use AAAA-MM.");
      return;
    }
    startTransition(async () => {
      const result = await upsertMonthlySnapshot(reference);
      if (result.ok) {
        toast.success("Snapshot gerado.");
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleRecalculate(snap: SnapshotRow) {
    const ref = snap.referenceMonth.slice(0, 7);
    startTransition(async () => {
      const result = await upsertMonthlySnapshot(ref);
      if (result.ok) {
        toast.success(`${snap.monthLabel} recalculado.`);
      } else {
        toast.error(result.error);
      }
    });
  }

  function confirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    startTransition(async () => {
      const result = await deleteMonthlySnapshot(target.id);
      if (result.ok) {
        toast.success("Snapshot removido.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="flex flex-col gap-1.5">
          <span className="text-muted-foreground text-xs tracking-wide uppercase">Histórico</span>
          <h1 className="text-3xl font-semibold tracking-tight">Snapshots mensais</h1>
          <p className="text-muted-foreground text-sm">
            Cada snapshot congela os totais do mês. O cron os gera automaticamente no dia 1, mas
            você pode forçar a geração ou recalcular um existente.
          </p>
        </div>
      </header>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="text-base">Gerar manualmente</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
          <div className="flex max-w-xs flex-1 flex-col gap-2">
            <Label htmlFor="snapshot-month">Mês de referência</Label>
            <Input
              id="snapshot-month"
              type="month"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              max={currentMonthRef()}
              disabled={isPending}
            />
          </div>
          <Button onClick={handleGenerate} disabled={isPending}>
            <Camera className="mr-1.5 size-4" strokeWidth={1.5} />
            {isPending ? "Gerando..." : "Gerar snapshot"}
          </Button>
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Snapshots existentes</CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          {snapshots.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <Archive className="text-muted-foreground size-10" strokeWidth={1.25} aria-hidden />
              <p className="text-muted-foreground text-sm">
                Nenhum snapshot ainda. Gere o primeiro usando o formulário acima.
              </p>
            </div>
          ) : (
            <ul className="divide-border divide-y">
              {snapshots.map((snap) => (
                <li
                  key={snap.id}
                  className="hover:bg-muted/40 flex items-center gap-4 px-6 py-3 transition-colors"
                >
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="text-foreground truncate text-sm font-medium capitalize">
                      {snap.monthLabel}
                    </span>
                    <span className="text-muted-foreground truncate text-xs">
                      total acumulado · {formatBRL(snap.totalSave)}
                    </span>
                  </div>
                  <div className="hidden items-baseline gap-6 text-sm md:flex">
                    <Stat label="receitas" value={snap.totalIncomes} />
                    <Stat label="despesas" value={snap.totalExpenses} muted />
                    <Stat
                      label="invest."
                      value={(
                        Number(snap.totalLiquidSavings) + Number(snap.totalFixedIncome)
                      ).toFixed(2)}
                      muted
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="Ações"
                      disabled={isPending}
                      className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                    >
                      <MoreHorizontal aria-hidden className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => handleRecalculate(snap)}>
                        <RefreshCw className="mr-2 size-4" strokeWidth={1.5} />
                        Recalcular
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setPendingDelete(snap)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 size-4" strokeWidth={1.5} />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir snapshot</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir o snapshot de <span className="capitalize">{pendingDelete?.monthLabel}</span>?
              O total acumulado dos meses seguintes pode ficar incorreto até você recalculá-los.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground text-xs uppercase">{label}</span>
      <span className={cn("tabular-nums", muted ? "text-muted-foreground" : "text-foreground")}>
        {formatBRL(value)}
      </span>
    </span>
  );
}

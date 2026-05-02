"use client";

import { Archive, Camera, MoreHorizontal, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
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
import { cn, formatCurrency } from "@/lib/utils";

export function SnapshotsView({ snapshots }: { snapshots: SnapshotRow[] }) {
  const [reference, setReference] = useState(previousMonthRef());
  const [isPending, startTransition] = useTransition();
  const [pendingDelete, setPendingDelete] = useState<SnapshotRow | null>(null);

  function handleGenerate() {
    if (!isMonthRef(reference)) {
      toast.error("invalid month. use yyyy-mm.");
      return;
    }
    startTransition(async () => {
      const result = await upsertMonthlySnapshot(reference);
      if (result.ok) {
        toast.success("snapshot generated.");
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
        toast.success(`${snap.monthLabel} recomputed.`);
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
        toast.success("snapshot removed.");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="snapshots"
      subtitle="frozen monthly totals"
      toolbar={
        <div className="flex items-center gap-2">
          <Label htmlFor="snapshot-month" className="text-muted-foreground text-[12px]">
            month
          </Label>
          <Input
            id="snapshot-month"
            type="month"
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            max={currentMonthRef()}
            disabled={isPending}
            className="h-8 w-[140px] text-[13px]"
          />
          <Button onClick={handleGenerate} disabled={isPending} size="sm">
            <Camera className="size-3.5" strokeWidth={1.5} />
            {isPending ? "generating..." : "generate"}
          </Button>
        </div>
      }
    >
      {snapshots.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
          <Archive className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
          <div className="flex max-w-sm flex-col gap-1">
            <h2 className="text-foreground text-[14px] font-medium">no snapshots yet</h2>
            <p className="text-muted-foreground text-[13px]">
              the cron generates them on day 1; or trigger one above.
            </p>
          </div>
        </div>
      ) : (
        <ul className="divide-border divide-y">
          {snapshots.map((snap) => (
            <li
              key={snap.id}
              className="hover:bg-muted/40 flex items-center gap-4 px-5 py-3 transition-colors"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="text-foreground truncate text-[13px] font-medium capitalize">
                  {snap.monthLabel}
                </span>
                <span className="text-muted-foreground truncate text-[12px]">
                  cumulative · {formatCurrency(snap.totalSave)}
                </span>
              </div>
              <div className="hidden items-baseline gap-5 md:flex">
                <Stat label="incomes" value={snap.totalIncomes} />
                <Stat label="expenses" value={snap.totalExpenses} muted />
                <Stat
                  label="invest."
                  value={(Number(snap.totalLiquidSavings) + Number(snap.totalFixedIncome)).toFixed(
                    2,
                  )}
                  muted
                />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="actions"
                  disabled={isPending}
                  className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <MoreHorizontal aria-hidden className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => handleRecalculate(snap)}>
                    <RefreshCw className="mr-2 size-3.5" strokeWidth={1.5} />
                    recompute
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setPendingDelete(snap)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 size-3.5" strokeWidth={1.5} />
                    delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}

      <AlertDialog open={pendingDelete !== null} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete snapshot?</AlertDialogTitle>
            <AlertDialogDescription>
              delete the snapshot for{" "}
              <span className="capitalize">{pendingDelete?.monthLabel}</span>? the cumulative save
              of following months may be off until you recompute them.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

function Stat({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wider">{label}</span>
      <span
        className={cn(
          "numeric text-[12.5px] tabular-nums",
          muted ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {formatCurrency(value)}
      </span>
    </span>
  );
}

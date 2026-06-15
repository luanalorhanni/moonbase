"use client";

import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Landmark,
  LineChart,
  MoreHorizontal,
  PiggyBank,
  Plus,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

import { InvestmentsAllocationChart } from "@/components/charts/investments-allocation-chart";
import { InvestmentsBalanceChart } from "@/components/charts/investments-balance-chart";
import { EditorialHero } from "@/components/dashboard/editorial-hero";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteFixedIncome, deleteLiquidSavings } from "@/lib/actions/investments";
import type { CardRow } from "@/lib/queries/cards";
import type { InvestmentUpdateRow } from "@/lib/queries/investment-updates";
import type { FixedIncomeRow, LiquidSavingsRow } from "@/lib/queries/investments";
import { cn } from "@/lib/utils";

import { FixedIncomeForm } from "./fixed-income-form";
import { InvestmentUpdatesDialog } from "./investment-updates-dialog";
import { LiquidSavingsForm } from "./liquid-savings-form";

/* ────────────────────────────────────────────────────────────────────── */
/*  Types & helpers                                                        */
/* ────────────────────────────────────────────────────────────────────── */

type Kind = "liquid" | "fixed";

type LiquidDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; item: LiquidSavingsRow };

type FixedDialog = { kind: "closed" } | { kind: "create" } | { kind: "edit"; item: FixedIncomeRow };

type Filter = "all" | "active" | Kind;

type Props = {
  liquidSavings: LiquidSavingsRow[];
  fixedIncome: FixedIncomeRow[];
  updates: InvestmentUpdateRow[];
  cards: CardRow[];
};

type UpdatesDialogState =
  | { open: false }
  | {
      open: true;
      investment: {
        kind: "liquid_savings" | "fixed_income";
        id: string;
        title: string;
        bank: string;
        appliedAmount: number;
        applicationDate: string;
      };
    };

type UnifiedRow = {
  id: string;
  kind: Kind;
  title: string;
  bank: string;
  cardName: string | null;
  cardColor: string | null;
  appliedAmount: number;
  balance: number; // current balance (`latestYield` field — naming legacy)
  gain: number;
  gainPct: number;
  applicationDate: string;
  lastUpdateDate: string | null;
  maturityDate: string | null;
  isActive: boolean;
};

function formatBRL(value: number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", year: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function matchCard(bank: string, cards: CardRow[]): { name: string; color: string } | null {
  const norm = (s: string) => s.toLowerCase().trim();
  const b = norm(bank);
  const card = cards.find((c) => (c.bank && norm(c.bank) === b) || norm(c.name) === b);
  return card ? { name: card.name, color: card.color } : null;
}

function unifiedFromRows(
  liquid: LiquidSavingsRow[],
  fixed: FixedIncomeRow[],
  cards: CardRow[],
): UnifiedRow[] {
  const fromLiquid: UnifiedRow[] = liquid.map((i) => {
    const applied = Number(i.appliedAmount);
    const balance = Number(i.latestYield);
    const gain = balance - applied;
    const matched = matchCard(i.bank, cards);
    return {
      id: `l-${i.id}`,
      kind: "liquid",
      title: i.title,
      bank: i.bank,
      cardName: matched?.name ?? null,
      cardColor: matched?.color ?? null,
      appliedAmount: applied,
      balance,
      gain,
      gainPct: applied > 0 ? (gain / applied) * 100 : 0,
      applicationDate: i.applicationDate,
      lastUpdateDate: i.lastUpdateDate,
      maturityDate: null,
      isActive: i.isActive,
    };
  });
  const fromFixed: UnifiedRow[] = fixed.map((i) => {
    const applied = Number(i.appliedAmount);
    const balance = Number(i.latestYield);
    const gain = balance - applied;
    const matched = matchCard(i.bank, cards);
    return {
      id: `f-${i.id}`,
      kind: "fixed",
      title: i.title,
      bank: i.bank,
      cardName: matched?.name ?? null,
      cardColor: matched?.color ?? null,
      appliedAmount: applied,
      balance,
      gain,
      gainPct: applied > 0 ? (gain / applied) * 100 : 0,
      applicationDate: i.applicationDate,
      lastUpdateDate: i.lastUpdateDate,
      maturityDate: i.maturityDate,
      isActive: i.isActive,
    };
  });
  return [...fromLiquid, ...fromFixed].sort((a, b) => b.balance - a.balance);
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Page                                                                   */
/* ────────────────────────────────────────────────────────────────────── */

export function InvestmentsPage({ liquidSavings, fixedIncome, updates, cards }: Props) {
  const router = useRouter();
  const [liquidDialog, setLiquidDialog] = useState<LiquidDialog>({ kind: "closed" });
  const [fixedDialog, setFixedDialog] = useState<FixedDialog>({ kind: "closed" });
  const [updatesDialog, setUpdatesDialog] = useState<UpdatesDialogState>({ open: false });
  const [pendingDeleteLiquid, setPendingDeleteLiquid] = useState<LiquidSavingsRow | null>(null);
  const [pendingDeleteFixed, setPendingDeleteFixed] = useState<FixedIncomeRow | null>(null);
  const [isDeleting, startDeleteTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("active");

  const allRows = useMemo(
    () => unifiedFromRows(liquidSavings, fixedIncome, cards),
    [liquidSavings, fixedIncome, cards],
  );

  const visibleRows = useMemo(() => {
    switch (filter) {
      case "all":
        return allRows;
      case "active":
        return allRows.filter((r) => r.isActive);
      case "liquid":
        return allRows.filter((r) => r.kind === "liquid");
      case "fixed":
        return allRows.filter((r) => r.kind === "fixed");
    }
  }, [allRows, filter]);

  /* ─── Aggregates over active rows ─────────────────────────────────── */
  const summary = useMemo(() => {
    const active = allRows.filter((r) => r.isActive);
    const liquidActive = active.filter((r) => r.kind === "liquid");
    const fixedActive = active.filter((r) => r.kind === "fixed");
    const totalApplied = active.reduce((acc, r) => acc + r.appliedAmount, 0);
    const totalBalance = active.reduce((acc, r) => acc + r.balance, 0);
    const totalGain = totalBalance - totalApplied;
    const totalGainPct = totalApplied > 0 ? (totalGain / totalApplied) * 100 : 0;

    return {
      totalApplied,
      totalBalance,
      totalGain,
      totalGainPct,
      liquidBalance: liquidActive.reduce((a, r) => a + r.balance, 0),
      fixedBalance: fixedActive.reduce((a, r) => a + r.balance, 0),
      activeCount: active.length,
    };
  }, [allRows]);

  /* ─── Allocation chart — liquid vs fixed ──────────────────────────── */
  const allocationData = useMemo(
    () =>
      [
        {
          key: "liquid",
          label: "liquid savings",
          value: summary.liquidBalance,
          color: "oklch(0.78 0.09 200)", // electric aqua
        },
        {
          key: "fixed",
          label: "fixed income",
          value: summary.fixedBalance,
          color: "oklch(0.65 0.06 325)", // dusty mauve
        },
      ].filter((d) => d.value > 0),
    [summary],
  );

  /* ─── Per-investment balance chart (active only) ──────────────────── */
  const balanceData = useMemo(
    () =>
      allRows
        .filter((r) => r.isActive)
        .map((r) => ({
          key: r.id,
          label: r.title,
          applied: r.appliedAmount,
          gain: r.gain,
        })),
    [allRows],
  );

  /* ─── Mutations ───────────────────────────────────────────────────── */
  function handleDeleteLiquid(item: LiquidSavingsRow) {
    startDeleteTransition(async () => {
      const result = await deleteLiquidSavings(item.id);
      if (result.ok) {
        toast.success("investment removed.");
        setPendingDeleteLiquid(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteFixed(item: FixedIncomeRow) {
    startDeleteTransition(async () => {
      const result = await deleteFixedIncome(item.id);
      if (result.ok) {
        toast.success("investment removed.");
        setPendingDeleteFixed(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function openEdit(row: UnifiedRow) {
    if (row.kind === "liquid") {
      const item = liquidSavings.find((i) => `l-${i.id}` === row.id);
      if (item) setLiquidDialog({ kind: "edit", item });
    } else {
      const item = fixedIncome.find((i) => `f-${i.id}` === row.id);
      if (item) setFixedDialog({ kind: "edit", item });
    }
  }

  function openDelete(row: UnifiedRow) {
    if (row.kind === "liquid") {
      const item = liquidSavings.find((i) => `l-${i.id}` === row.id);
      if (item) setPendingDeleteLiquid(item);
    } else {
      const item = fixedIncome.find((i) => `f-${i.id}` === row.id);
      if (item) setPendingDeleteFixed(item);
    }
  }

  function openUpdates(row: UnifiedRow) {
    setUpdatesDialog({
      open: true,
      investment: {
        kind: row.kind === "liquid" ? "liquid_savings" : "fixed_income",
        id: row.id.slice(2), // strip the 'l-'/'f-' prefix
        title: row.title,
        bank: row.bank,
        appliedAmount: row.appliedAmount,
        applicationDate: row.applicationDate,
      },
    });
  }

  return (
    <PageShell
      title="investments"
      subtitle="liquid savings and fixed income"
      toolbar={
        <DropdownMenu>
          <DropdownMenuTrigger className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring/50 inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors focus-visible:ring-3 focus-visible:outline-none">
            <Plus aria-hidden className="size-3.5" /> new investment
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setLiquidDialog({ kind: "create" })}>
              <PiggyBank aria-hidden className="size-3.5" />
              liquid savings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFixedDialog({ kind: "create" })}>
              <Landmark aria-hidden className="size-3.5" />
              fixed income
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    >
      <EditorialHero
        caption="portfolio"
        title="investments"
        subtitle="liquid savings and fixed income, growing over time"
        tone="aqua"
      />

      {/* ── KPI strip ─────────────────────────────────────────────── */}
      <div className="border-border grid shrink-0 grid-cols-2 gap-2 border-b p-2.5 md:grid-cols-5 md:gap-2.5 md:px-4 md:py-3">
        <Kpi label="total balance" value={summary.totalBalance} accent="primary" highlight />
        <Kpi
          label="total gain"
          value={summary.totalGain}
          accent={summary.totalGain >= 0 ? "success" : "destructive"}
          delta={summary.totalGainPct}
          deltaTone="positive"
        />
        <Kpi
          label="liquid savings"
          value={summary.liquidBalance}
          icon={<PiggyBank aria-hidden className="size-3" strokeWidth={1.6} />}
        />
        <Kpi
          label="fixed income"
          value={summary.fixedBalance}
          icon={<Landmark aria-hidden className="size-3" strokeWidth={1.6} />}
        />
        <Kpi
          label="applied principal"
          value={summary.totalApplied}
          hint={`${summary.activeCount} active`}
        />
      </div>

      {/* ── Charts row ────────────────────────────────────────────── */}
      <div className="border-border grid shrink-0 grid-cols-1 border-b lg:grid-cols-12">
        <div className="border-border flex flex-col gap-3 px-5 py-5 lg:col-span-4 lg:border-r">
          <PanelTitle>allocation</PanelTitle>
          <InvestmentsAllocationChart
            data={allocationData}
            caption="proportion by type, current balance"
          />
        </div>
        <div className="flex flex-col gap-3 px-5 py-5 lg:col-span-8">
          <div className="flex items-baseline justify-between">
            <PanelTitle>balance per investment</PanelTitle>
            <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-wider">
              applied
              <span
                aria-hidden
                className="ml-1 inline-block size-2 rounded-sm align-middle"
                style={{ backgroundColor: "oklch(0.72 0.05 265)" }}
              />
              <span className="mx-2">·</span>
              gain
              <span
                aria-hidden
                className="ml-1 inline-block size-2 rounded-sm align-middle"
                style={{ backgroundColor: "oklch(0.78 0.09 200)" }}
              />
            </span>
          </div>
          <InvestmentsBalanceChart data={balanceData} />
        </div>
      </div>

      {/* ── Filters ──────────────────────────────────────────────── */}
      <div className="border-border bg-muted/20 flex shrink-0 items-center gap-2 border-b px-4 py-2">
        <span className="text-muted-foreground font-mono text-[10.5px] tracking-[0.16em] uppercase">
          show
        </span>
        {(
          [
            ["active", "active"],
            ["all", "all"],
            ["liquid", "liquid only"],
            ["fixed", "fixed only"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-md px-2.5 py-1 text-[12px] transition-colors",
              filter === value
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
        <span className="text-muted-foreground/60 ml-auto font-mono text-[10.5px] tabular-nums">
          {visibleRows.length} {visibleRows.length === 1 ? "item" : "items"}
        </span>
      </div>

      {/* ── Unified table ────────────────────────────────────────── */}
      {visibleRows.length === 0 ? (
        <EmptyState
          onAdd={() => setLiquidDialog({ kind: "create" })}
          description={
            allRows.length === 0
              ? "log savings, LCIs, CDBs, treasuries — anything you've parked."
              : "nothing matches this filter."
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                title
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                bank
              </TableHead>
              <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
                applied
              </TableHead>
              <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
                balance
              </TableHead>
              <TableHead className="py-2 text-right font-mono text-[11px] font-normal tracking-[0.16em]">
                gain
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                applied on
              </TableHead>
              <TableHead className="py-2 font-mono text-[11px] font-normal tracking-[0.16em]">
                maturity / updated
              </TableHead>
              <TableHead className="w-10 py-2" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleRows.map((row) => (
              <TableRow key={row.id} className={row.isActive ? "" : "opacity-50"}>
                <TableCell className="py-3">
                  <div className="flex items-center gap-2">
                    <KindChip kind={row.kind} />
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-medium">{row.title}</div>
                      {!row.isActive && (
                        <span className="text-muted-foreground text-[11px]">inactive</span>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell className="py-3">
                  <BankChip name={row.bank} cardName={row.cardName} cardColor={row.cardColor} />
                </TableCell>
                <TableCell className="numeric text-muted-foreground py-3 text-right text-[12.5px] tabular-nums">
                  {formatBRL(row.appliedAmount)}
                </TableCell>
                <TableCell className="numeric text-foreground py-3 text-right text-[13.5px] font-semibold tabular-nums">
                  {formatBRL(row.balance)}
                </TableCell>
                <TableCell className="py-3 text-right">
                  <GainCell gain={row.gain} pct={row.gainPct} />
                </TableCell>
                <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                  {formatDate(row.applicationDate)}
                </TableCell>
                <TableCell className="py-3 font-mono text-[12px] tabular-nums">
                  {row.kind === "fixed" ? (
                    <span className="text-foreground/85">{formatDate(row.maturityDate)}</span>
                  ) : (
                    <span className="text-muted-foreground">{formatDate(row.lastUpdateDate)}</span>
                  )}
                </TableCell>
                <TableCell className="py-3">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      aria-label="actions"
                      className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                    >
                      <MoreHorizontal aria-hidden className="size-3.5" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openUpdates(row)}>
                        <LineChart aria-hidden className="size-3.5" />
                        log update
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openEdit(row)}>edit</DropdownMenuItem>
                      <DropdownMenuItem variant="destructive" onClick={() => openDelete(row)}>
                        delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* ── Dialogs & confirms ───────────────────────────────────── */}
      <Dialog
        open={liquidDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setLiquidDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {liquidDialog.kind === "edit" ? "edit liquid savings" : "new liquid savings"}
            </DialogTitle>
            <DialogDescription>
              {liquidDialog.kind === "edit"
                ? "update balance and yield."
                : "log a savings/cash account with instant liquidity."}
            </DialogDescription>
          </DialogHeader>
          <LiquidSavingsForm
            key={liquidDialog.kind === "edit" ? liquidDialog.item.id : "create"}
            item={liquidDialog.kind === "edit" ? liquidDialog.item : undefined}
            onSuccess={() => {
              setLiquidDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog
        open={fixedDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setFixedDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {fixedDialog.kind === "edit" ? "edit fixed income" : "new fixed income"}
            </DialogTitle>
            <DialogDescription>
              {fixedDialog.kind === "edit"
                ? "update balance and yield."
                : "log an LCI, LCA, CDB, or treasury bond."}
            </DialogDescription>
          </DialogHeader>
          <FixedIncomeForm
            key={fixedDialog.kind === "edit" ? fixedDialog.item.id : "create"}
            item={fixedDialog.kind === "edit" ? fixedDialog.item : undefined}
            onSuccess={() => {
              setFixedDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={pendingDeleteLiquid !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteLiquid(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteLiquid ? `"${pendingDeleteLiquid.title}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteLiquid) handleDeleteLiquid(pendingDeleteLiquid);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <InvestmentUpdatesDialog
        open={updatesDialog.open}
        onOpenChange={(o) => {
          if (!o) setUpdatesDialog({ open: false });
        }}
        investment={updatesDialog.open ? updatesDialog.investment : null}
        updates={updates}
      />

      <AlertDialog
        open={pendingDeleteFixed !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteFixed(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteFixed ? `"${pendingDeleteFixed.title}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteFixed) handleDeleteFixed(pendingDeleteFixed);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Building blocks                                                        */
/* ────────────────────────────────────────────────────────────────────── */

function PanelTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-muted-foreground font-mono text-[11px] tracking-[0.2em] uppercase">
      {children}
    </h3>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaTone = "positive",
  hint,
  accent = "muted",
  highlight,
  icon,
}: {
  label: string;
  value: number;
  delta?: number;
  deltaTone?: "positive" | "inverted";
  hint?: string;
  accent?: "muted" | "primary" | "success" | "destructive";
  highlight?: boolean;
  icon?: React.ReactNode;
}) {
  const showDelta = delta !== undefined && Number.isFinite(delta) && delta !== 0;
  const deltaPositive = (delta ?? 0) >= 0;
  const isGood = deltaTone === "positive" ? deltaPositive : !deltaPositive;
  const deltaClass = !showDelta ? "" : isGood ? "text-success" : "text-destructive";

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1 overflow-hidden rounded-xl border px-3 py-3 lg:px-4 lg:py-3.5",
        highlight
          ? "border-primary/20 from-primary/[0.13] to-primary/[0.04] bg-gradient-to-br"
          : "border-primary/[0.08] from-primary/[0.07] to-primary/[0.01] bg-gradient-to-br",
      )}
    >
      <span className="text-muted-foreground flex items-center gap-1.5 truncate font-mono text-[10px] tracking-[0.16em]">
        {icon}
        {label}
      </span>
      <span
        className={cn(
          "numeric block truncate text-[14px] leading-tight font-semibold tracking-tight tabular-nums lg:text-[19px]",
          accent === "primary" && "text-primary",
          accent === "success" && "text-success",
          accent === "destructive" && "text-destructive",
          accent === "muted" && "text-foreground",
        )}
      >
        {formatBRL(value)}
      </span>
      {showDelta && (
        <span className={cn("inline-flex items-center gap-0.5 font-mono text-[10px]", deltaClass)}>
          {deltaPositive ? (
            <ArrowUpRight aria-hidden className="size-2.5 shrink-0" strokeWidth={2} />
          ) : (
            <ArrowDownRight aria-hidden className="size-2.5 shrink-0" strokeWidth={2} />
          )}
          <span className="numeric tabular-nums">{Math.abs(delta!).toFixed(1)}%</span>
        </span>
      )}
      {hint && !showDelta && (
        <span className="text-muted-foreground font-mono text-[10px] tracking-wider">{hint}</span>
      )}
    </div>
  );
}

function KindChip({ kind }: { kind: Kind }) {
  if (kind === "liquid") {
    return (
      <span
        className="border-border bg-card/60 inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase"
        style={{ borderColor: "color-mix(in oklab, oklch(0.78 0.09 200) 35%, var(--border))" }}
        title="liquid savings"
      >
        <PiggyBank aria-hidden className="size-2.5" strokeWidth={1.7} />
        <span>liq</span>
      </span>
    );
  }
  return (
    <span
      className="border-border bg-card/60 inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase"
      style={{ borderColor: "color-mix(in oklab, oklch(0.65 0.06 325) 35%, var(--border))" }}
      title="fixed income"
    >
      <Landmark aria-hidden className="size-2.5" strokeWidth={1.7} />
      <span>fix</span>
    </span>
  );
}

function BankChip({
  name,
  cardName,
  cardColor,
}: {
  name: string;
  cardName: string | null;
  cardColor: string | null;
}) {
  return (
    <span
      className="border-border bg-card/60 inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 font-mono text-[11px] tracking-wide"
      style={
        cardColor
          ? { borderColor: `color-mix(in oklab, ${cardColor} 40%, var(--border))` }
          : undefined
      }
    >
      <span
        aria-hidden
        className="block size-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: cardColor ?? "var(--muted-foreground)" }}
      />
      <span className="text-foreground/80 max-w-[100px] truncate">{cardName ?? name}</span>
    </span>
  );
}

function GainCell({ gain, pct }: { gain: number; pct: number }) {
  if (gain === 0) {
    return <span className="text-muted-foreground/70 font-mono text-[12px] tabular-nums">—</span>;
  }
  const positive = gain > 0;
  return (
    <div className="flex flex-col items-end leading-tight">
      <span
        className={cn(
          "numeric inline-flex items-baseline gap-0.5 text-[13px] tabular-nums",
          positive ? "text-success" : "text-destructive",
        )}
      >
        {positive ? (
          <ArrowUpRight aria-hidden className="size-3 self-center" strokeWidth={2} />
        ) : (
          <ArrowDownRight aria-hidden className="size-3 self-center" strokeWidth={2} />
        )}
        {formatBRL(Math.abs(gain))}
      </span>
      <span
        className={cn(
          "font-mono text-[10.5px] tabular-nums",
          positive ? "text-success/70" : "text-destructive/70",
        )}
      >
        {positive ? "+" : ""}
        {pct.toFixed(2)}%
      </span>
    </div>
  );
}

function EmptyState({ onAdd, description }: { onAdd: () => void; description: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <Banknote className="text-muted-foreground/60 size-10" strokeWidth={1} aria-hidden />
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">no investments yet</h2>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new investment
      </Button>
    </div>
  );
}

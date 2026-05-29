"use client";

import {
  Banknote,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronUp,
  CircleCheck,
  CreditCard,
  Download,
  HandCoins,
  MoreHorizontal,
  Plus,
  Undo2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";

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
import { deleteCashReceivable, markCashReceivableAsPaid } from "@/lib/actions/cash-receivables";
import {
  deleteCreditReceivable,
  setMonthParcelsPaid,
  toggleCreditParcelPaid,
} from "@/lib/actions/credit-receivables";
import type { CardRow } from "@/lib/queries/cards";
import type { CashReceivableRow, CreditReceivableWithCard } from "@/lib/queries/receivables";
import { cn } from "@/lib/utils";
import { LOAN_TYPE_LABEL } from "@/lib/validation/cash-receivable";

import { CashReceivableForm } from "./cash-receivable-form";
import { CreditReceivableForm } from "./credit-receivable-form";

const EN_MONTH_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
];

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

function formatMonthShort(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${EN_MONTH_SHORT[m - 1]}/${String(y).slice(2)}`;
}

function formatMonthLong(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return `${EN_MONTH_LONG[m - 1]} ${y}`;
}

function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit" })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function formatAmount(value: string | number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "BRL" }).format(
    typeof value === "string" ? Number(value) : value,
  );
}

/** Brazilian-format currency (R$ 417,47) — used in CSVs shared with payers. */
function formatAmountBR(value: string | number): string {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    typeof value === "string" ? Number(value) : value,
  );
}

/** dd/mm/yyyy — readable date for non-technical recipients. */
function formatDateBR(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}

/** Pt-BR month name + year ("junho 2026") for CSV "mês de cobrança" column. */
function formatMonthBR(yyyymm: string): string {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" })
    .format(new Date(y, m - 1, 1))
    .toLowerCase();
}

/**
 * Quote a CSV cell when it contains the delimiter, a quote, or a line break.
 * We use ';' as the delimiter (Brazilian Excel convention) so BRL values
 * with comma decimals stay readable without forced quoting.
 */
function csvCell(value: string): string {
  if (/[";\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

/**
 * Build a CSV string from headers + rows and trigger a download. Includes a
 * UTF-8 BOM so Excel opens accented characters correctly.
 */
function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const lines = [headers, ...rows].map((r) => r.map(csvCell).join(";"));
  const csv = "﻿" + lines.join("\r\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** Split "yyyy-mm" or "yyyy-mm-dd" → "yyyy-mm". */
function toMonth(value: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 7);
}

/** Normalize from yyyy-mm to a comparable index. */
function monthIndex(yyyymm: string): number {
  const [y, m] = yyyymm.split("-").map(Number);
  return y * 12 + (m - 1);
}

function indexToMonth(idx: number): string {
  const y = Math.floor(idx / 12);
  const m = (idx % 12) + 1;
  return `${y}-${String(m).padStart(2, "0")}`;
}

type Tab = "credit" | "cash";

type CashDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; receivable: CashReceivableRow };

type CreditDialog =
  | { kind: "closed" }
  | { kind: "create" }
  | { kind: "edit"; receivable: CreditReceivableWithCard };

type PaidParcelKey = { receivableId: string; parcelNumber: number };

type Props = {
  cashReceivables: CashReceivableRow[];
  creditReceivables: CreditReceivableWithCard[];
  paidParcels: PaidParcelKey[];
  cards: CardRow[];
};

function paidKey(receivableId: string, parcelNumber: number): string {
  return `${receivableId}:${parcelNumber}`;
}

export function ReceivablesPage({ cashReceivables, creditReceivables, paidParcels, cards }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("credit");
  const [cashDialog, setCashDialog] = useState<CashDialog>({ kind: "closed" });
  const [creditDialog, setCreditDialog] = useState<CreditDialog>({ kind: "closed" });
  const [pendingDeleteCash, setPendingDeleteCash] = useState<CashReceivableRow | null>(null);
  const [pendingDeleteCredit, setPendingDeleteCredit] = useState<CreditReceivableWithCard | null>(
    null,
  );
  const [isDeleting, startDeleteTransition] = useTransition();
  const [isMarking, startMarkTransition] = useTransition();
  const [isSettling, startSettleTransition] = useTransition();

  const paidSet = useMemo(
    () => new Set(paidParcels.map((p) => paidKey(p.receivableId, p.parcelNumber))),
    [paidParcels],
  );

  function isParcelPaid(receivableId: string, parcelNumber: number): boolean {
    return paidSet.has(paidKey(receivableId, parcelNumber));
  }

  function handleToggleParcel(receivableId: string, parcelNumber: number, paid: boolean) {
    startSettleTransition(async () => {
      const result = await toggleCreditParcelPaid(receivableId, parcelNumber, paid);
      if (result.ok) {
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSettleMonth(parcels: PaidParcelKey[], paid: boolean) {
    startSettleTransition(async () => {
      const result = await setMonthParcelsPaid(parcels, paid);
      if (result.ok) {
        toast.success(paid ? "month settled." : "month reopened.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  /* ─── Header summary ─────────────────────────────────────────────── */
  const refMonth = currentYearMonth();
  const refIdx = monthIndex(refMonth);

  const upcomingCreditParcels = useMemo(() => {
    let count = 0;
    let total = 0;
    for (const r of creditReceivables) {
      const fm = toMonth(r.firstParcelMonth);
      if (!fm) continue;
      const startIdx = monthIndex(fm);
      for (let i = 0; i < r.totalParcels; i++) {
        const parcelNumber = i + 1;
        if (startIdx + i >= refIdx && !paidSet.has(paidKey(r.id, parcelNumber))) {
          count += 1;
          total += Number(r.parcelValue);
        }
      }
    }
    return { count, total };
  }, [creditReceivables, refIdx, paidSet]);

  const thisMonthCreditTotal = useMemo(() => {
    let total = 0;
    for (const r of creditReceivables) {
      const fm = toMonth(r.firstParcelMonth);
      const lm = toMonth(r.lastParcelMonth);
      if (!fm || !lm) continue;
      const startIdx = monthIndex(fm);
      if (refIdx >= startIdx && refIdx <= monthIndex(lm)) {
        const parcelNumber = refIdx - startIdx + 1;
        if (!paidSet.has(paidKey(r.id, parcelNumber))) {
          total += Number(r.parcelValue);
        }
      }
    }
    return total;
  }, [creditReceivables, refIdx, paidSet]);

  const cashPending = useMemo(() => {
    const pending = cashReceivables.filter((r) => !r.isPaid);
    return {
      count: pending.length,
      total: pending.reduce((acc, r) => acc + Number(r.amount), 0),
    };
  }, [cashReceivables]);

  function handleDeleteCash(r: CashReceivableRow) {
    startDeleteTransition(async () => {
      const result = await deleteCashReceivable(r.id);
      if (result.ok) {
        toast.success("receivable removed.");
        setPendingDeleteCash(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleDeleteCredit(r: CreditReceivableWithCard) {
    startDeleteTransition(async () => {
      const result = await deleteCreditReceivable(r.id);
      if (result.ok) {
        toast.success("receivable removed.");
        setPendingDeleteCredit(null);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleMarkAsPaid(r: CashReceivableRow) {
    startMarkTransition(async () => {
      const result = await markCashReceivableAsPaid(r.id);
      if (result.ok) {
        toast.success("marked as received.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="receivables"
      subtitle="amounts owed to you"
      toolbar={
        <Button
          onClick={() =>
            tab === "credit"
              ? setCreditDialog({ kind: "create" })
              : setCashDialog({ kind: "create" })
          }
          size="sm"
        >
          <Plus aria-hidden className="size-3.5" /> new receivable
        </Button>
      }
    >
      <EditorialHero
        caption="owed to you"
        title="receivables"
        subtitle="loans and card installments coming back"
        tone="mauve"
      />

      {/* kpi strip */}
      <div className="border-border grid shrink-0 grid-cols-1 gap-2 border-b p-2.5 sm:grid-cols-3 sm:gap-2.5 sm:px-4 sm:py-3">
        <Kpi label="this month parcels" value={thisMonthCreditTotal} accent="primary" highlight />
        <Kpi
          label="upcoming parcels"
          value={upcomingCreditParcels.total}
          hint={`${upcomingCreditParcels.count} ${upcomingCreditParcels.count === 1 ? "parcel" : "parcels"}`}
        />
        <Kpi
          label="cash loans pending"
          value={cashPending.total}
          hint={`${cashPending.count} ${cashPending.count === 1 ? "loan" : "loans"}`}
        />
      </div>

      {/* tab switcher */}
      <div className="border-border flex shrink-0 gap-0 border-b px-2">
        <TabButton
          active={tab === "credit"}
          onClick={() => setTab("credit")}
          icon={<CreditCard className="size-3.5" strokeWidth={1.6} />}
          label="card installments"
          count={creditReceivables.length}
        />
        <TabButton
          active={tab === "cash"}
          onClick={() => setTab("cash")}
          icon={<Banknote className="size-3.5" strokeWidth={1.6} />}
          label="cash loans"
          count={cashReceivables.length}
        />
        <div className="flex-1" />
      </div>

      {tab === "credit" ? (
        <CreditByMonthSection
          receivables={creditReceivables}
          referenceMonth={refMonth}
          isParcelPaid={isParcelPaid}
          onToggleParcel={handleToggleParcel}
          onSettleMonth={handleSettleMonth}
          isSettling={isSettling}
          onAdd={() => setCreditDialog({ kind: "create" })}
          onEdit={(r) => setCreditDialog({ kind: "edit", receivable: r })}
          onDelete={(r) => setPendingDeleteCredit(r)}
        />
      ) : (
        <CashSection
          receivables={cashReceivables}
          onAdd={() => setCashDialog({ kind: "create" })}
          onEdit={(r) => setCashDialog({ kind: "edit", receivable: r })}
          onDelete={(r) => setPendingDeleteCash(r)}
          onMarkPaid={handleMarkAsPaid}
          isMarking={isMarking}
        />
      )}

      {/* cash dialog */}
      <Dialog
        open={cashDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setCashDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {cashDialog.kind === "edit" ? "edit receivable" : "new cash loan"}
            </DialogTitle>
            <DialogDescription>
              {cashDialog.kind === "edit"
                ? "update receivable details."
                : "log money you've lent that you'll get back."}
            </DialogDescription>
          </DialogHeader>
          <CashReceivableForm
            key={cashDialog.kind === "edit" ? cashDialog.receivable.id : "create"}
            receivable={cashDialog.kind === "edit" ? cashDialog.receivable : undefined}
            onSuccess={() => {
              setCashDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* credit dialog */}
      <Dialog
        open={creditDialog.kind !== "closed"}
        onOpenChange={(open) => {
          if (!open) setCreditDialog({ kind: "closed" });
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {creditDialog.kind === "edit" ? "edit receivable" : "new card installment"}
            </DialogTitle>
            <DialogDescription>
              {creditDialog.kind === "edit"
                ? "update receivable details."
                : "log a card purchase someone else will pay back in installments."}
            </DialogDescription>
          </DialogHeader>
          <CreditReceivableForm
            key={creditDialog.kind === "edit" ? creditDialog.receivable.id : "create"}
            receivable={creditDialog.kind === "edit" ? creditDialog.receivable : undefined}
            cards={cards}
            onSuccess={() => {
              setCreditDialog({ kind: "closed" });
              router.refresh();
            }}
          />
        </DialogContent>
      </Dialog>

      {/* cash delete confirm */}
      <AlertDialog
        open={pendingDeleteCash !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCash(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete receivable?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCash ? `"${pendingDeleteCash.description}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCash) handleDeleteCash(pendingDeleteCash);
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* credit delete confirm */}
      <AlertDialog
        open={pendingDeleteCredit !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDeleteCredit(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete receivable?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDeleteCredit ? `"${pendingDeleteCredit.description}" will be removed.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                if (pendingDeleteCredit) handleDeleteCredit(pendingDeleteCredit);
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

/**
 * Mirrors `Kpi` in `month-dashboard.tsx`: same horizontal strip, same
 * label/value typography, same right-border separators. Kept local because
 * the home variant supports a `delta` indicator we don't need here.
 */
function Kpi({
  label,
  value,
  hint,
  accent = "muted",
  highlight,
}: {
  label: string;
  value: number;
  hint?: string;
  accent?: "muted" | "primary" | "success" | "destructive";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 overflow-hidden rounded-xl border px-4 py-4 sm:px-5 sm:py-4",
        highlight
          ? "border-primary/20 from-primary/[0.13] to-primary/[0.04] bg-gradient-to-br"
          : "border-primary/[0.08] from-primary/[0.07] to-primary/[0.01] bg-gradient-to-br",
      )}
    >
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.2em]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "numeric text-[24px] leading-none font-semibold tracking-tight tabular-nums",
            accent === "primary" && "text-primary",
            accent === "success" && "text-success",
            accent === "destructive" && "text-destructive",
            accent === "muted" && "text-foreground",
          )}
        >
          {formatAmount(value)}
        </span>
        {hint && (
          <span className="text-muted-foreground font-mono text-[11px] tracking-wider">{hint}</span>
        )}
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  count: number;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-2 px-4 py-3 text-[13px] transition-colors",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {active && <span aria-hidden className="bg-primary absolute inset-x-0 -bottom-px h-[2px]" />}
      {icon}
      <span>{label}</span>
      <span
        className={cn(
          "ml-1 rounded-md px-1.5 py-0.5 font-mono text-[10.5px] tabular-nums",
          active ? "bg-primary/10 text-primary" : "bg-muted/60 text-muted-foreground",
        )}
      >
        {count}
      </span>
    </button>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Credit (card installments) — grouped by month                          */
/* ────────────────────────────────────────────────────────────────────── */

type ParcelEntry = {
  receivableId: string;
  month: string;
  parcelNumber: number;
  totalParcels: number;
  parcelValue: string;
  description: string;
  purchaseDate: string;
  cardName: string;
  cardColor: string;
  receivable: CreditReceivableWithCard;
};

function CreditByMonthSection({
  receivables,
  referenceMonth,
  isParcelPaid,
  onToggleParcel,
  onSettleMonth,
  isSettling,
  onAdd,
  onEdit,
  onDelete,
}: {
  receivables: CreditReceivableWithCard[];
  referenceMonth: string;
  isParcelPaid: (receivableId: string, parcelNumber: number) => boolean;
  onToggleParcel: (receivableId: string, parcelNumber: number, paid: boolean) => void;
  onSettleMonth: (parcels: { receivableId: string; parcelNumber: number }[], paid: boolean) => void;
  isSettling: boolean;
  onAdd: () => void;
  onEdit: (r: CreditReceivableWithCard) => void;
  onDelete: (r: CreditReceivableWithCard) => void;
}) {
  const [showPast, setShowPast] = useState(false);

  const { byMonth, sortedMonths } = useMemo(() => {
    const parcels: ParcelEntry[] = [];
    for (const r of receivables) {
      const fm = toMonth(r.firstParcelMonth);
      if (!fm) continue;
      const startIdx = monthIndex(fm);
      for (let i = 0; i < r.totalParcels; i++) {
        parcels.push({
          receivableId: r.id,
          month: indexToMonth(startIdx + i),
          parcelNumber: i + 1,
          totalParcels: r.totalParcels,
          parcelValue: r.parcelValue,
          description: r.description,
          purchaseDate: r.purchaseDate,
          cardName: r.cardName,
          cardColor: r.cardColor,
          receivable: r,
        });
      }
    }

    const map = new Map<string, ParcelEntry[]>();
    for (const p of parcels) {
      const list = map.get(p.month);
      if (list) list.push(p);
      else map.set(p.month, [p]);
    }
    // Stable order within a month: by purchase date, then description
    for (const list of map.values()) {
      list.sort((a, b) => {
        if (a.purchaseDate === b.purchaseDate) return a.description.localeCompare(b.description);
        return a.purchaseDate < b.purchaseDate ? 1 : -1;
      });
    }

    return {
      byMonth: map,
      sortedMonths: Array.from(map.keys()).sort(),
    };
  }, [receivables]);

  if (receivables.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="size-10" strokeWidth={1} />}
        title="no card installments yet"
        description="log a card purchase someone else will pay back in installments."
        onAdd={onAdd}
      />
    );
  }

  const refIdx = monthIndex(referenceMonth);
  const upcoming = sortedMonths.filter((m) => monthIndex(m) >= refIdx);
  const past = sortedMonths.filter((m) => monthIndex(m) < refIdx);

  if (upcoming.length === 0 && past.length === 0) {
    return (
      <EmptyState
        icon={<CreditCard className="size-10" strokeWidth={1} />}
        title="no installments scheduled"
        description="installments will appear here grouped by month."
        onAdd={onAdd}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-4">
      {upcoming.length === 0 ? (
        <p className="text-muted-foreground bg-muted/30 rounded-md px-4 py-6 text-center text-[12.5px]">
          no upcoming parcels — everything&apos;s been paid up.
        </p>
      ) : (
        upcoming.map((month) => (
          <MonthGroup
            key={month}
            month={month}
            parcels={byMonth.get(month)!}
            isCurrent={month === referenceMonth}
            isParcelPaid={isParcelPaid}
            onToggleParcel={onToggleParcel}
            onSettleMonth={onSettleMonth}
            isSettling={isSettling}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))
      )}

      {past.length > 0 && (
        <div className="flex flex-col gap-3 pt-2">
          <button
            type="button"
            onClick={() => setShowPast((v) => !v)}
            className="border-border-strong text-muted-foreground hover:text-foreground flex items-center gap-2 self-start rounded-md border border-dashed px-3 py-1.5 text-[11.5px] transition-colors"
          >
            {showPast ? (
              <ChevronUp className="size-3" strokeWidth={1.8} />
            ) : (
              <ChevronDown className="size-3" strokeWidth={1.8} />
            )}
            {showPast ? "hide" : "show"} {past.length} past {past.length === 1 ? "month" : "months"}
          </button>
          {showPast &&
            past
              .slice()
              .reverse()
              .map((month) => (
                <MonthGroup
                  key={month}
                  month={month}
                  parcels={byMonth.get(month)!}
                  isCurrent={false}
                  isPast
                  isParcelPaid={isParcelPaid}
                  onToggleParcel={onToggleParcel}
                  onSettleMonth={onSettleMonth}
                  isSettling={isSettling}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
        </div>
      )}
    </div>
  );
}

function MonthGroup({
  month,
  parcels,
  isCurrent,
  isPast,
  isParcelPaid,
  onToggleParcel,
  onSettleMonth,
  isSettling,
  onEdit,
  onDelete,
}: {
  month: string;
  parcels: ParcelEntry[];
  isCurrent: boolean;
  isPast?: boolean;
  isParcelPaid: (receivableId: string, parcelNumber: number) => boolean;
  onToggleParcel: (receivableId: string, parcelNumber: number, paid: boolean) => void;
  onSettleMonth: (parcels: { receivableId: string; parcelNumber: number }[], paid: boolean) => void;
  isSettling: boolean;
  onEdit: (r: CreditReceivableWithCard) => void;
  onDelete: (r: CreditReceivableWithCard) => void;
}) {
  const monthTotal = parcels.reduce((acc, p) => acc + Number(p.parcelValue), 0);
  const paidCount = parcels.filter((p) => isParcelPaid(p.receivableId, p.parcelNumber)).length;
  const allPaid = paidCount === parcels.length && parcels.length > 0;
  const partiallyPaid = paidCount > 0 && !allPaid;
  const remainingTotal = parcels
    .filter((p) => !isParcelPaid(p.receivableId, p.parcelNumber))
    .reduce((acc, p) => acc + Number(p.parcelValue), 0);

  const monthKeys = parcels.map((p) => ({
    receivableId: p.receivableId,
    parcelNumber: p.parcelNumber,
  }));

  function handleExportCsv() {
    const headers = [
      "descrição",
      "parcela",
      "valor",
      "mês de cobrança",
      "data da compra",
      "cartão",
    ];
    const rows = parcels.map((p) => [
      p.description,
      `${p.parcelNumber} de ${p.totalParcels}`,
      formatAmountBR(p.parcelValue),
      formatMonthBR(p.month),
      formatDateBR(p.purchaseDate),
      p.cardName,
    ]);
    downloadCsv(`receivables-${month}.csv`, headers, rows);
  }

  return (
    <section
      className={cn(
        "border-border overflow-hidden rounded-lg border transition-opacity",
        isCurrent && !allPaid && "border-primary/40 bg-primary/[0.025]",
        allPaid && "border-success/30 bg-success/[0.04]",
        isPast && !allPaid && "opacity-60",
      )}
    >
      {/* month header */}
      <header
        className={cn(
          "border-border bg-muted/30 flex flex-wrap items-center justify-between gap-3 border-b px-4 py-2.5",
          isCurrent && !allPaid && "border-primary/30 bg-primary/[0.06]",
          allPaid && "border-success/30 bg-success/[0.08]",
        )}
      >
        <div className="flex flex-wrap items-baseline gap-3">
          <h3
            className={cn(
              "text-[14px] font-semibold tracking-tight",
              allPaid ? "text-success-foreground" : isCurrent ? "text-primary" : "text-foreground",
            )}
          >
            {formatMonthLong(month)}
          </h3>
          {allPaid ? (
            <span className="border-success/40 bg-success/15 text-success-foreground inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase">
              <CircleCheck className="size-3" strokeWidth={2} aria-hidden />
              settled
            </span>
          ) : isCurrent ? (
            <span className="text-primary border-primary/30 bg-primary/10 rounded-md border px-1.5 py-0.5 font-mono text-[10px] tracking-[0.14em] uppercase">
              this month
            </span>
          ) : null}
          <span className="text-muted-foreground font-mono text-[11px] tracking-[0.14em]">
            {partiallyPaid
              ? `${paidCount}/${parcels.length} paid`
              : `${parcels.length} ${parcels.length === 1 ? "parcel" : "parcels"}`}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end leading-tight">
            <span
              className={cn(
                "numeric text-[14px] font-semibold tabular-nums",
                allPaid
                  ? "text-success-foreground"
                  : isCurrent
                    ? "text-primary"
                    : "text-foreground",
              )}
            >
              {formatAmount(monthTotal)}
            </span>
            {partiallyPaid && (
              <span className="text-muted-foreground font-mono text-[10.5px] tabular-nums">
                {formatAmount(remainingTotal)} left
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={handleExportCsv}
            title="export this month's parcels as CSV"
            className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-7 shrink-0 px-2 text-[11.5px]"
          >
            <Download aria-hidden className="size-3" />
            csv
          </Button>

          {allPaid ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSettling}
              onClick={() => onSettleMonth(monthKeys, false)}
              className="text-muted-foreground hover:text-foreground hover:bg-muted h-7 shrink-0 px-2 text-[11.5px]"
            >
              <Undo2 aria-hidden className="size-3" />
              reopen
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              disabled={isSettling}
              onClick={() => onSettleMonth(monthKeys, true)}
              className={cn(
                "h-7 shrink-0 px-2 text-[11.5px]",
                isCurrent
                  ? "text-primary hover:bg-primary/10 hover:text-primary"
                  : "text-muted-foreground hover:text-success-foreground hover:bg-success/10",
              )}
            >
              <CheckCheck aria-hidden className="size-3" />
              {partiallyPaid ? "settle remaining" : "settle month"}
            </Button>
          )}
        </div>
      </header>

      {/* parcel list */}
      <ul className="divide-border divide-y">
        {parcels.map((p) => {
          const paid = isParcelPaid(p.receivableId, p.parcelNumber);
          const progressPct = (p.parcelNumber / p.totalParcels) * 100;
          return (
            <li
              key={`${p.receivableId}-${p.parcelNumber}`}
              className={cn(
                "hover:bg-muted/20 flex items-center gap-3 px-4 py-3 transition-colors",
                paid && "bg-success/[0.025]",
              )}
            >
              {/* paid checkbox toggle */}
              <button
                type="button"
                onClick={() => onToggleParcel(p.receivableId, p.parcelNumber, !paid)}
                disabled={isSettling}
                aria-label={paid ? "mark parcel as unpaid" : "mark parcel as paid"}
                aria-pressed={paid}
                className={cn(
                  "focus-visible:ring-ring/50 inline-flex size-5 shrink-0 items-center justify-center rounded-md border transition-all focus-visible:ring-3 focus-visible:outline-none",
                  paid
                    ? "border-success/50 bg-success/20 text-success-foreground hover:bg-success/30"
                    : "border-border hover:border-primary/40 hover:bg-primary/5 text-transparent",
                )}
              >
                <Check className="size-3" strokeWidth={2.5} aria-hidden />
              </button>

              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    "text-[13.5px] font-medium",
                    paid && "text-muted-foreground decoration-muted-foreground/40 line-through",
                  )}
                >
                  {p.description}
                </div>
                <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[11.5px]">
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: p.cardColor }}
                    aria-hidden
                  />
                  <span
                    className="border-border bg-card/60 truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium"
                    style={{
                      borderColor: `color-mix(in oklab, ${p.cardColor} 35%, var(--border))`,
                    }}
                  >
                    {p.cardName}
                  </span>
                  <span className="font-mono">purchased {formatDate(p.purchaseDate)}</span>
                </div>
              </div>

              {/* parcel chip with progress */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11.5px] tabular-nums">
                  <span className="text-foreground font-semibold">{p.parcelNumber}</span>
                  <span className="text-muted-foreground/60">/{p.totalParcels}</span>
                </span>
                <span className="bg-muted relative block h-1 w-12 overflow-hidden rounded-full">
                  <span
                    className={cn(
                      "absolute inset-y-0 left-0 rounded-full",
                      paid
                        ? "bg-success-foreground/70"
                        : p.parcelNumber === p.totalParcels
                          ? "bg-primary"
                          : "bg-primary/70",
                    )}
                    style={{ width: `${progressPct}%` }}
                  />
                </span>
              </div>

              <span
                className={cn(
                  "numeric w-24 shrink-0 text-right text-[13.5px] font-semibold tabular-nums",
                  paid ? "text-muted-foreground line-through" : "text-foreground",
                )}
              >
                {formatAmount(p.parcelValue)}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="actions"
                  className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
                >
                  <MoreHorizontal aria-hidden className="size-3.5" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onToggleParcel(p.receivableId, p.parcelNumber, !paid)}
                  >
                    {paid ? "mark as unpaid" : "mark as paid"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEdit(p.receivable)}>
                    edit purchase
                  </DropdownMenuItem>
                  <DropdownMenuItem variant="destructive" onClick={() => onDelete(p.receivable)}>
                    delete purchase
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Cash (single-payment loans)                                            */
/* ────────────────────────────────────────────────────────────────────── */

function CashSection({
  receivables,
  onAdd,
  onEdit,
  onDelete,
  onMarkPaid,
  isMarking,
}: {
  receivables: CashReceivableRow[];
  onAdd: () => void;
  onEdit: (r: CashReceivableRow) => void;
  onDelete: (r: CashReceivableRow) => void;
  onMarkPaid: (r: CashReceivableRow) => void;
  isMarking: boolean;
}) {
  const [showReceived, setShowReceived] = useState(false);

  if (receivables.length === 0) {
    return (
      <EmptyState
        icon={<HandCoins className="size-10" strokeWidth={1} />}
        title="no cash loans yet"
        description="log money you've lent out and expect to get back as a single payment."
        onAdd={onAdd}
      />
    );
  }

  const pending = receivables.filter((r) => !r.isPaid);
  const received = receivables.filter((r) => r.isPaid);

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      {/* pending */}
      <section className="border-border overflow-hidden rounded-lg border">
        <header className="border-border bg-muted/30 flex items-baseline justify-between border-b px-4 py-2.5">
          <h3 className="text-foreground text-[14px] font-semibold">pending</h3>
          <span className="text-muted-foreground font-mono text-[11px] tracking-[0.14em]">
            {pending.length} {pending.length === 1 ? "loan" : "loans"}
          </span>
        </header>
        {pending.length === 0 ? (
          <p className="text-muted-foreground px-4 py-6 text-center text-[12.5px]">
            no pending loans.
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {pending.map((r) => (
              <CashRow
                key={r.id}
                r={r}
                onEdit={onEdit}
                onDelete={onDelete}
                onMarkPaid={onMarkPaid}
                isMarking={isMarking}
              />
            ))}
          </ul>
        )}
      </section>

      {/* received (collapsed) */}
      {received.length > 0 && (
        <section
          className={cn(
            "border-border overflow-hidden rounded-lg border",
            !showReceived && "bg-muted/20",
          )}
        >
          <button
            type="button"
            onClick={() => setShowReceived((v) => !v)}
            className="hover:bg-muted/30 flex w-full items-baseline justify-between border-b border-transparent px-4 py-2.5 text-left transition-colors"
          >
            <span className="text-muted-foreground flex items-center gap-2 text-[14px] font-medium">
              {showReceived ? (
                <ChevronUp className="size-3.5" strokeWidth={1.8} />
              ) : (
                <ChevronDown className="size-3.5" strokeWidth={1.8} />
              )}
              received
            </span>
            <span className="text-muted-foreground font-mono text-[11px] tracking-[0.14em]">
              {received.length} {received.length === 1 ? "loan" : "loans"}
            </span>
          </button>
          {showReceived && (
            <ul className="divide-border divide-y border-t">
              {received.map((r) => (
                <CashRow
                  key={r.id}
                  r={r}
                  onEdit={onEdit}
                  onDelete={onDelete}
                  onMarkPaid={onMarkPaid}
                  isMarking={isMarking}
                />
              ))}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}

function CashRow({
  r,
  onEdit,
  onDelete,
  onMarkPaid,
  isMarking,
}: {
  r: CashReceivableRow;
  onEdit: (r: CashReceivableRow) => void;
  onDelete: (r: CashReceivableRow) => void;
  onMarkPaid: (r: CashReceivableRow) => void;
  isMarking: boolean;
}) {
  return (
    <li
      className={cn(
        "hover:bg-muted/20 flex items-center gap-3 px-4 py-3 transition-colors",
        r.isPaid && "opacity-60",
      )}
    >
      <div className="min-w-0 flex-1">
        <div className="text-[13.5px] font-medium">{r.description}</div>
        <div className="text-muted-foreground mt-0.5 flex items-center gap-2 text-[11.5px]">
          <span className="border-border bg-card/60 rounded-md border px-1.5 py-0.5 text-[10.5px] font-medium tracking-wider uppercase">
            {LOAN_TYPE_LABEL[r.loanType]}
          </span>
          <span className="font-mono">lent {formatDate(r.loanDate)}</span>
          <span className="text-muted-foreground/60">·</span>
          <span className="font-mono">expected {formatMonthShort(r.expectedPaymentMonth)}</span>
          {r.isPaid && r.actualPaymentDate && (
            <>
              <span className="text-muted-foreground/60">·</span>
              <span className="text-success-foreground font-mono">
                received {formatDate(r.actualPaymentDate)}
              </span>
            </>
          )}
        </div>
      </div>

      <span className="numeric text-foreground w-24 shrink-0 text-right text-[13.5px] font-semibold tabular-nums">
        {formatAmount(r.amount)}
      </span>

      {!r.isPaid && (
        <Button
          variant="ghost"
          size="sm"
          disabled={isMarking}
          onClick={() => onMarkPaid(r)}
          className="text-muted-foreground hover:text-primary hover:bg-primary/10 h-7 shrink-0 px-2 text-[11.5px]"
        >
          <Check aria-hidden className="size-3" />
          mark paid
        </Button>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger
          aria-label="actions"
          className="hover:bg-muted aria-expanded:bg-muted focus-visible:ring-ring/50 inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors focus-visible:ring-3 focus-visible:outline-none"
        >
          <MoreHorizontal aria-hidden className="size-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onEdit(r)}>edit</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => onDelete(r)}>
            delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Empty state                                                            */
/* ────────────────────────────────────────────────────────────────────── */

function EmptyState({
  icon,
  title,
  description,
  onAdd,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  onAdd: () => void;
}) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <span className="text-muted-foreground/60" aria-hidden>
        {icon}
      </span>
      <div className="flex max-w-sm flex-col gap-1">
        <h2 className="text-foreground text-[14px] font-medium">{title}</h2>
        <p className="text-muted-foreground text-[13px]">{description}</p>
      </div>
      <Button onClick={onAdd} size="sm" className="mt-2">
        <Plus aria-hidden className="size-3.5" /> new receivable
      </Button>
    </div>
  );
}

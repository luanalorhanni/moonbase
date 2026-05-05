"use client";

import { useMemo, useState } from "react";

import { CategoryIcon } from "@/components/ui/category-icon";
import { cn, formatCurrency } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────── */
/*  Row types                                                              */
/* ────────────────────────────────────────────────────────────────────── */

export type CashDetailRow = {
  id: string;
  date: string;
  description: string;
  cardName: string;
  cardColor: string;
  method: "pix" | "debit" | "cash";
  category: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  subcategory: string;
  amount: string;
};

export type CreditDetailRow = {
  id: string;
  purchaseDate: string;
  description: string;
  cardName: string;
  cardColor: string;
  category: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  subcategory: string;
  parcelNumber: number;
  totalParcels: number;
  remainingParcels: number;
  parcelValue: string;
  totalValue: string;
};

export type FixedDetailRow = {
  id: string;
  description: string;
  cardName: string;
  cardColor: string;
  paymentMethod: "cash" | "credit";
  category: string;
  categoryIcon?: string | null;
  categoryColor?: string | null;
  subcategory: string;
  dueDay: number | null;
  amount: string;
};

export type IncomeDetailRow = {
  id: string;
  date: string;
  description: string;
  type: string;
  amount: string;
};

export type ReceivableDetailRow = {
  id: string;
  date: string;
  description: string;
  kind: "cash" | "credit";
  // credit-only
  cardName: string | null;
  cardColor: string | null;
  parcelNumber?: number;
  totalParcels?: number;
  remainingParcels?: number;
  parcelValue?: string;
  totalValue?: string;
  // cash-only
  loanDate?: string;
  loanType?: string;
  expectedPaymentMonth?: string;
  // shared
  amount: string;
  status: "pending" | "paid";
  paidOn: string | null;
};

export type DetailLists = {
  cash: CashDetailRow[];
  credit: CreditDetailRow[];
  fixed: FixedDetailRow[];
  incomes: IncomeDetailRow[];
  receivables: ReceivableDetailRow[];
};

type Tab = keyof DetailLists;

const TABS: { key: Tab; label: string; emptyHint: string }[] = [
  { key: "cash", label: "cash expenses", emptyHint: "no cash entries this month." },
  { key: "credit", label: "credit installments", emptyHint: "no installments fall here." },
  { key: "fixed", label: "recurring", emptyHint: "no recurring expenses active." },
  { key: "incomes", label: "incomes", emptyHint: "no income recorded." },
  { key: "receivables", label: "receivables", emptyHint: "nothing pending." },
];

/* ────────────────────────────────────────────────────────────────────── */
/*  Helpers                                                                */
/* ────────────────────────────────────────────────────────────────────── */

function formatDate(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
  })
    .format(new Date(y, m - 1, d))
    .toLowerCase();
}

function formatMonth(yyyyMm: string): string {
  const parts = yyyyMm.slice(0, 7).split("-").map(Number);
  const [y, m] = parts;
  return new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" })
    .format(new Date(y, m - 1, 1))
    .toLowerCase();
}

/** p75 threshold above which a row's amount is considered "large". */
function highlightThreshold(values: number[]): number {
  if (values.length === 0) return Infinity;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.floor(sorted.length * 0.75);
  return sorted[Math.min(idx, sorted.length - 1)];
}

const TH =
  "text-muted-foreground bg-muted/30 sticky top-0 z-10 px-4 py-2 text-left font-mono text-[11px] font-normal tracking-[0.16em] backdrop-blur";
const TD = "px-4 py-3 text-[13px]";

function Dot({ color }: { color: string | null | undefined }) {
  if (!color) return null;
  return (
    <span
      aria-hidden
      className="block size-2 shrink-0 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function CardCell({ name, color }: { name: string; color: string }) {
  return (
    <span className="flex items-center gap-2">
      <Dot color={color} />
      <span
        className="border-border bg-card/60 truncate rounded-md border px-2 py-0.5 text-[12px] font-medium"
        style={{
          borderColor: `color-mix(in oklab, ${color} 35%, var(--border))`,
        }}
      >
        {name}
      </span>
    </span>
  );
}

function CategoryCell({
  category,
  subcategory,
  icon,
  color,
}: {
  category: string;
  subcategory: string;
  icon?: string | null;
  color?: string | null;
}) {
  return (
    <span className="flex items-center gap-2 text-[12px]">
      {icon ? (
        <span
          aria-hidden
          className="border-border bg-card/60 flex size-5 shrink-0 items-center justify-center rounded-md border"
          style={{
            borderColor: color ? `color-mix(in oklab, ${color} 35%, var(--border))` : undefined,
          }}
        >
          <CategoryIcon icon={icon} color={color ?? undefined} size={12} />
        </span>
      ) : null}
      <span className="min-w-0 truncate">
        <span className="text-muted-foreground">{category}</span>
        <span className="text-muted-foreground/40 mx-1">/</span>
        <span className="text-foreground">{subcategory}</span>
      </span>
    </span>
  );
}

function AmountCell({
  value,
  isLarge,
  emphasized,
}: {
  value: string;
  isLarge: boolean;
  emphasized?: boolean;
}) {
  return (
    <span
      className={cn(
        "numeric tabular-nums",
        isLarge ? "text-foreground text-[14px] font-semibold" : "text-foreground/85 text-[13px]",
        emphasized && "text-primary",
      )}
    >
      {formatCurrency(value)}
    </span>
  );
}

function ParcelProgress({
  current,
  total,
  remaining,
}: {
  current: number;
  total: number;
  remaining: number;
}) {
  if (total <= 1) {
    return (
      <span className="text-muted-foreground font-mono text-[11.5px] tracking-wider">single</span>
    );
  }
  const pct = Math.max(0, Math.min(100, (current / total) * 100));
  return (
    <span className="flex items-center gap-2">
      <span className="numeric text-foreground/85 text-[12px] tabular-nums">
        {current}/{total}
      </span>
      <span className="bg-muted relative block h-1 w-16 overflow-hidden rounded-full">
        <span
          className="bg-primary/70 absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="text-muted-foreground/70 font-mono text-[11px] tabular-nums">
        {remaining > 0 ? `${remaining} left` : "last"}
      </span>
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Component                                                              */
/* ────────────────────────────────────────────────────────────────────── */

export function DetailTabs({ lists, totals }: { lists: DetailLists; totals: Record<Tab, string> }) {
  const [active, setActive] = useState<Tab>("cash");
  const empty = TABS.find((t) => t.key === active)!.emptyHint;

  const counts: Record<Tab, number> = {
    cash: lists.cash.length,
    credit: lists.credit.length,
    fixed: lists.fixed.length,
    incomes: lists.incomes.length,
    receivables: lists.receivables.length,
  };

  return (
    <div className="border-border flex flex-col border-t">
      <div className="border-border bg-muted/20 flex shrink-0 items-stretch border-b">
        {TABS.map((t) => {
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              aria-current={isActive ? "true" : undefined}
              className={cn(
                "border-border relative flex items-baseline gap-2 border-r px-5 py-3 text-[13px] transition-colors",
                isActive
                  ? "text-foreground bg-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-background/60",
              )}
            >
              {isActive && (
                <span aria-hidden className="bg-primary absolute inset-x-0 -top-px h-[2px]" />
              )}
              <span>{t.label}</span>
              <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wider">
                {counts[t.key]}
              </span>
              <span className="numeric text-muted-foreground/70 ml-2 text-[11.5px]">
                {formatCurrency(totals[t.key])}
              </span>
            </button>
          );
        })}
        <div className="bg-muted/20 flex-1" />
      </div>

      <div className="min-h-[600px]">
        {active === "cash" && <CashTable rows={lists.cash} empty={empty} />}
        {active === "credit" && <CreditTable rows={lists.credit} empty={empty} />}
        {active === "fixed" && <FixedTable rows={lists.fixed} empty={empty} />}
        {active === "incomes" && <IncomeTable rows={lists.incomes} empty={empty} />}
        {active === "receivables" && <ReceivableTable rows={lists.receivables} empty={empty} />}
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Per-tab tables                                                         */
/* ────────────────────────────────────────────────────────────────────── */

function CashTable({ rows, empty }: { rows: CashDetailRow[]; empty: string }) {
  const threshold = useMemo(() => highlightThreshold(rows.map((r) => Number(r.amount))), [rows]);
  if (rows.length === 0) return <Empty hint={empty} />;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={cn(TH, "w-[88px]")}>date</th>
          <th className={TH}>description</th>
          <th className={TH}>card</th>
          <th className={cn(TH, "w-[80px]")}>method</th>
          <th className={TH}>category</th>
          <th className={cn(TH, "w-[140px] text-right")}>amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-border hover:bg-muted/30 border-b transition-colors">
            <td
              className={cn(TD, "text-muted-foreground/80 font-mono text-[11.5px] tracking-wider")}
            >
              {formatDate(r.date)}
            </td>
            <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
            <td className={TD}>
              <CardCell name={r.cardName} color={r.cardColor} />
            </td>
            <td className={cn(TD, "text-muted-foreground text-[12px]")}>{r.method}</td>
            <td className={TD}>
              <CategoryCell
                category={r.category}
                subcategory={r.subcategory}
                icon={r.categoryIcon}
                color={r.categoryColor}
              />
            </td>
            <td className={cn(TD, "text-right")}>
              <AmountCell value={r.amount} isLarge={Number(r.amount) >= threshold} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function CreditTable({ rows, empty }: { rows: CreditDetailRow[]; empty: string }) {
  const threshold = useMemo(
    () => highlightThreshold(rows.map((r) => Number(r.parcelValue))),
    [rows],
  );
  if (rows.length === 0) return <Empty hint={empty} />;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={cn(TH, "w-[88px]")}>purchased</th>
          <th className={TH}>description</th>
          <th className={TH}>card</th>
          <th className={TH}>category</th>
          <th className={cn(TH, "w-[200px]")}>installment</th>
          <th className={cn(TH, "w-[110px] text-right")}>this parcel</th>
          <th className={cn(TH, "w-[110px] text-right")}>total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-border hover:bg-muted/30 border-b transition-colors">
            <td
              className={cn(TD, "text-muted-foreground/80 font-mono text-[11.5px] tracking-wider")}
            >
              {formatDate(r.purchaseDate)}
            </td>
            <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
            <td className={TD}>
              <CardCell name={r.cardName} color={r.cardColor} />
            </td>
            <td className={TD}>
              <CategoryCell
                category={r.category}
                subcategory={r.subcategory}
                icon={r.categoryIcon}
                color={r.categoryColor}
              />
            </td>
            <td className={TD}>
              <ParcelProgress
                current={r.parcelNumber}
                total={r.totalParcels}
                remaining={r.remainingParcels}
              />
            </td>
            <td className={cn(TD, "text-right")}>
              <AmountCell value={r.parcelValue} isLarge={Number(r.parcelValue) >= threshold} />
            </td>
            <td
              className={cn(
                TD,
                "text-muted-foreground/80 numeric text-right text-[12px] tabular-nums",
              )}
            >
              {formatCurrency(r.totalValue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function FixedTable({ rows, empty }: { rows: FixedDetailRow[]; empty: string }) {
  const threshold = useMemo(() => highlightThreshold(rows.map((r) => Number(r.amount))), [rows]);
  if (rows.length === 0) return <Empty hint={empty} />;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={TH}>description</th>
          <th className={TH}>card</th>
          <th className={cn(TH, "w-[80px]")}>method</th>
          <th className={TH}>category</th>
          <th className={cn(TH, "w-[80px]")}>due</th>
          <th className={cn(TH, "w-[140px] text-right")}>monthly</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-border hover:bg-muted/30 border-b transition-colors">
            <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
            <td className={TD}>
              <CardCell name={r.cardName} color={r.cardColor} />
            </td>
            <td className={cn(TD, "text-muted-foreground text-[12px]")}>{r.paymentMethod}</td>
            <td className={TD}>
              <CategoryCell
                category={r.category}
                subcategory={r.subcategory}
                icon={r.categoryIcon}
                color={r.categoryColor}
              />
            </td>
            <td className={cn(TD, "text-muted-foreground/80 font-mono text-[12px] tabular-nums")}>
              {r.dueDay ? `day ${r.dueDay}` : "—"}
            </td>
            <td className={cn(TD, "text-right")}>
              <AmountCell value={r.amount} isLarge={Number(r.amount) >= threshold} />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IncomeTable({ rows, empty }: { rows: IncomeDetailRow[]; empty: string }) {
  const threshold = useMemo(() => highlightThreshold(rows.map((r) => Number(r.amount))), [rows]);
  if (rows.length === 0) return <Empty hint={empty} />;
  return (
    <table className="w-full border-collapse">
      <thead>
        <tr>
          <th className={cn(TH, "w-[88px]")}>date</th>
          <th className={TH}>description</th>
          <th className={TH}>type</th>
          <th className={cn(TH, "w-[140px] text-right")}>amount</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.id} className="border-border hover:bg-muted/30 border-b transition-colors">
            <td
              className={cn(TD, "text-muted-foreground/80 font-mono text-[11.5px] tracking-wider")}
            >
              {formatDate(r.date)}
            </td>
            <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
            <td className={cn(TD, "text-muted-foreground text-[12px]")}>{r.type}</td>
            <td className={cn(TD, "text-right")}>
              <AmountCell value={r.amount} isLarge={Number(r.amount) >= threshold} emphasized />
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ReceivableTable({ rows, empty }: { rows: ReceivableDetailRow[]; empty: string }) {
  const cash = useMemo(() => rows.filter((r) => r.kind === "cash"), [rows]);
  const credit = useMemo(() => rows.filter((r) => r.kind === "credit"), [rows]);
  const cashThreshold = useMemo(
    () => highlightThreshold(cash.map((r) => Number(r.amount))),
    [cash],
  );
  const creditThreshold = useMemo(
    () => highlightThreshold(credit.map((r) => Number(r.parcelValue ?? r.amount))),
    [credit],
  );

  if (rows.length === 0) return <Empty hint={empty} />;

  return (
    <div className="flex flex-col">
      {credit.length > 0 && (
        <>
          {cash.length > 0 && (
            <div className="border-border bg-muted/10 border-b px-4 py-1.5">
              <span className="text-muted-foreground/60 font-mono text-[10px] tracking-[0.2em]">
                credit receivables
              </span>
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(TH, "w-[88px]")}>purchased</th>
                <th className={TH}>description</th>
                <th className={TH}>card</th>
                <th className={cn(TH, "w-[200px]")}>installment</th>
                <th className={cn(TH, "w-[130px]")}>status</th>
                <th className={cn(TH, "w-[110px] text-right")}>this parcel</th>
                <th className={cn(TH, "w-[110px] text-right")}>total</th>
              </tr>
            </thead>
            <tbody>
              {credit.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-border hover:bg-muted/30 border-b transition-colors",
                    r.status === "paid" && "opacity-60",
                  )}
                >
                  <td
                    className={cn(
                      TD,
                      "text-muted-foreground/80 font-mono text-[11.5px] tracking-wider",
                    )}
                  >
                    {formatDate(r.date)}
                  </td>
                  <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
                  <td className={TD}>
                    {r.cardName ? (
                      <CardCell name={r.cardName} color={r.cardColor ?? "#9ca3af"} />
                    ) : (
                      <span className="text-muted-foreground text-[12px]">—</span>
                    )}
                  </td>
                  <td className={TD}>
                    <ParcelProgress
                      current={r.parcelNumber ?? 1}
                      total={r.totalParcels ?? 1}
                      remaining={r.remainingParcels ?? 0}
                    />
                  </td>
                  <td className={TD}>
                    {r.status === "paid" ? (
                      <span className="text-success flex items-center gap-1.5 text-[12px]">
                        <span className="bg-success/70 size-1.5 shrink-0 rounded-full" />
                        paid{r.paidOn ? ` · ${formatDate(r.paidOn)}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                        <span className="border-muted-foreground/50 size-1.5 shrink-0 rounded-full border" />
                        pending
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <AmountCell
                      value={r.parcelValue ?? r.amount}
                      isLarge={Number(r.parcelValue ?? r.amount) >= creditThreshold}
                    />
                  </td>
                  <td
                    className={cn(
                      TD,
                      "text-muted-foreground/80 numeric text-right text-[12px] tabular-nums",
                    )}
                  >
                    {r.totalValue ? formatCurrency(r.totalValue) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {cash.length > 0 && (
        <>
          {credit.length > 0 && (
            <div className="border-border bg-muted/10 border-y px-4 py-1.5">
              <span className="text-muted-foreground/60 font-mono text-[10px] tracking-[0.2em]">
                cash receivables
              </span>
            </div>
          )}
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className={cn(TH, "w-[88px]")}>loan date</th>
                <th className={TH}>description</th>
                <th className={cn(TH, "w-[80px]")}>method</th>
                <th className={cn(TH, "w-[120px]")}>expected</th>
                <th className={cn(TH, "w-[140px]")}>status</th>
                <th className={cn(TH, "w-[140px] text-right")}>amount</th>
              </tr>
            </thead>
            <tbody>
              {cash.map((r) => (
                <tr
                  key={r.id}
                  className={cn(
                    "border-border hover:bg-muted/30 border-b transition-colors",
                    r.status === "paid" && "opacity-60",
                  )}
                >
                  <td
                    className={cn(
                      TD,
                      "text-muted-foreground/80 font-mono text-[11.5px] tracking-wider",
                    )}
                  >
                    {r.loanDate ? formatDate(r.loanDate) : formatDate(r.date)}
                  </td>
                  <td className={cn(TD, "text-foreground font-medium")}>{r.description}</td>
                  <td className={cn(TD, "text-muted-foreground text-[12px]")}>
                    {r.loanType ?? "—"}
                  </td>
                  <td className={cn(TD, "text-muted-foreground/80 font-mono text-[11.5px]")}>
                    {r.expectedPaymentMonth ? formatMonth(r.expectedPaymentMonth) : "—"}
                  </td>
                  <td className={TD}>
                    {r.status === "paid" ? (
                      <span className="text-success flex items-center gap-1.5 text-[12px]">
                        <span className="bg-success/70 size-1.5 shrink-0 rounded-full" />
                        paid{r.paidOn ? ` · ${formatDate(r.paidOn)}` : ""}
                      </span>
                    ) : (
                      <span className="text-muted-foreground flex items-center gap-1.5 text-[12px]">
                        <span className="border-muted-foreground/50 size-1.5 shrink-0 rounded-full border" />
                        pending
                      </span>
                    )}
                  </td>
                  <td className={cn(TD, "text-right")}>
                    <AmountCell
                      value={r.amount}
                      isLarge={Number(r.amount) >= cashThreshold}
                      emphasized
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}

function Empty({ hint }: { hint: string }) {
  return (
    <div className="flex h-[200px] items-center justify-center">
      <p className="text-muted-foreground text-[13px]">{hint}</p>
    </div>
  );
}

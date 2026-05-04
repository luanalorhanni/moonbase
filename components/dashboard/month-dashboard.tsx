import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { CategoryBreakdownChart } from "@/components/charts/category-breakdown-chart";
import { DetailTabs, type DetailLists } from "@/components/dashboard/detail-tabs";
import { SnapshotBadge } from "@/components/dashboard/snapshot-badge";
import {
  PixelMoonCrescent,
  PixelMoonFull,
  PixelStarSmall,
} from "@/components/decorative/pixel-icons";
import {
  currentMonthRef,
  formatMonthLong,
  formatMonthShort,
  shiftMonth,
  type MonthRef,
} from "@/lib/finance/month";
import { listLiquidSavings } from "@/lib/queries/investments";
import { loadMonth } from "@/lib/queries/month";
import { cn, formatCurrency } from "@/lib/utils";

const PT_INCOME_TYPE: Record<string, string> = {
  salary: "salary",
  research_grant: "research grant",
  refund: "refund",
  fee: "fee",
  sale: "sale",
  other: "other",
};

const PT_METHOD: Record<string, string> = {
  pix: "pix",
  debit: "debit",
  cash: "cash",
};

export async function MonthDashboard({ reference }: { reference: MonthRef }) {
  const [summary, liquidSavings] = await Promise.all([loadMonth(reference), listLiquidSavings()]);
  const totalLiquidSavings = liquidSavings
    .filter((i) => i.isActive)
    .reduce((acc, i) => acc + Number(i.latestYield), 0)
    .toFixed(2);
  // The previous month's aggregate is computed in loadMonth from the
  // FULL dataset (not the slice filtered for `reference`) — using the
  // slice would re-filter May data by April and only keep multi-parcel
  // ongoing rows + recurring fixed expenses, which is wrong.
  const previousMonthAgg = summary.previousMonth;

  const incomeDelta = pctDelta(previousMonthAgg.totalIncomes, summary.totalIncomes);
  const expenseDelta = pctDelta(previousMonthAgg.totalExpenses, summary.totalExpenses);
  // Past month "saved" = balance of the prior month. Delta shows how the
  // current month compares — positive means current is doing better than
  // last (saving more), negative means it slipped.
  const lastMonthSaveDelta = pctDelta(previousMonthAgg.balance, summary.balance);

  // Combined category breakdown (cash + credit + fixed) — already aggregated
  // by aggregateMonth as summary.byCategory. We use the full list here, not
  // just the top 6, so the user sees every category that consumed money.
  const categoryChartData = summary.byCategory.map((b) => ({
    key: b.key,
    label: b.label,
    total: Number(b.total),
    icon: b.icon,
    color: b.color,
  }));
  const totalCategorized = categoryChartData.reduce((acc, c) => acc + c.total, 0);
  const topCategory = categoryChartData[0];

  // Totals by payment method (cash + credit + fixed combined)
  const cashByMethod: Record<"pix" | "debit" | "cash", number> = {
    pix: 0,
    debit: 0,
    cash: 0,
  };
  for (const e of summary.data.cashExpenses) {
    cashByMethod[e.method] += Number(e.amount);
  }
  let fixedCashTotal = 0;
  let fixedCreditTotal = 0;
  for (const f of summary.data.fixedExpenses) {
    if (f.paymentMethod === "credit") fixedCreditTotal += Number(f.monthlyAmount);
    else fixedCashTotal += Number(f.monthlyAmount);
  }

  const paymentMethodTotals = [
    {
      key: "credit",
      label: "credit",
      total: Number(summary.totalCreditExpenses) + fixedCreditTotal,
    },
    { key: "pix", label: "pix", total: cashByMethod.pix },
    { key: "debit", label: "debit", total: cashByMethod.debit },
    { key: "cash", label: "cash", total: cashByMethod.cash },
    { key: "fixed", label: "fixed", total: fixedCashTotal },
  ].filter((m) => m.total > 0);

  // Credit detail per card (parcels of the month + fixed credit charged here)
  const creditCardMap = new Map<
    string,
    { id: string; name: string; color?: string; total: number }
  >();
  for (const e of summary.data.creditExpenses) {
    const ex = creditCardMap.get(e.cardId);
    if (ex) ex.total += Number(e.parcelValue);
    else
      creditCardMap.set(e.cardId, {
        id: e.cardId,
        name: e.cardName,
        color: e.cardColor,
        total: Number(e.parcelValue),
      });
  }
  for (const f of summary.data.fixedExpenses) {
    if (f.paymentMethod !== "credit") continue;
    const ex = creditCardMap.get(f.cardId);
    if (ex) ex.total += Number(f.monthlyAmount);
    else
      creditCardMap.set(f.cardId, {
        id: f.cardId,
        name: f.cardName,
        color: f.cardColor,
        total: Number(f.monthlyAmount),
      });
  }
  // Credit receivables per card — what other people owe me on this card
  // for parcels falling in this reference month. Subtracting from the
  // card's bill gives the amount that actually hits the bank.
  const creditReceivableByCard = new Map<string, number>();
  for (const r of summary.data.creditReceivables) {
    const prev = creditReceivableByCard.get(r.cardId) ?? 0;
    creditReceivableByCard.set(r.cardId, prev + Number(r.parcelValue));
  }

  const creditByCard = Array.from(creditCardMap.values())
    .map((c) => {
      const receivable = creditReceivableByCard.get(c.id) ?? 0;
      // c.total is what *I* pay (expenses only). The receivables for
      // others are also charged to this card, so the bill = my part +
      // what they owe me. That's the "total que vai dar no cartão"
      // shown as the faded detail.
      return { ...c, receivable, billTotal: c.total + receivable };
    })
    .sort((a, b) => b.total - a.total);
  const creditByCardTotal = creditByCard.reduce((acc, c) => acc + c.total, 0);
  const paymentMethodTotal = paymentMethodTotals.reduce((acc, m) => acc + m.total, 0);

  // Compute installment progress for credit expenses: which parcel falls
  // in this reference month, and how many remain after.
  function monthIndex(yyyyMm: string): number {
    const [y, m] = yyyyMm.split("-").map(Number);
    return y * 12 + (m - 1);
  }
  const refIndex = monthIndex(reference);

  const detailLists: DetailLists = {
    cash: summary.data.cashExpenses
      .map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        cardName: e.cardName,
        cardColor: e.cardColor,
        method: e.method,
        category: e.categoryName,
        categoryIcon: e.categoryIcon,
        categoryColor: e.categoryColor,
        subcategory: e.subcategoryName,
        amount: e.amount,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    credit: summary.data.creditExpenses
      .map((e) => {
        const firstIdx = e.firstParcelMonth ? monthIndex(e.firstParcelMonth.slice(0, 7)) : refIndex;
        const parcelNumber = Math.max(1, refIndex - firstIdx + 1);
        const remaining = Math.max(0, e.totalParcels - parcelNumber);
        const total = (Number(e.parcelValue) * e.totalParcels).toFixed(2);
        return {
          id: e.id,
          purchaseDate: e.purchaseDate,
          description: e.description,
          cardName: e.cardName,
          cardColor: e.cardColor,
          category: e.categoryName,
          categoryIcon: e.categoryIcon,
          categoryColor: e.categoryColor,
          subcategory: e.subcategoryName,
          parcelNumber,
          totalParcels: e.totalParcels,
          remainingParcels: remaining,
          parcelValue: e.parcelValue,
          totalValue: total,
        };
      })
      .sort((a, b) => (a.purchaseDate < b.purchaseDate ? 1 : -1)),
    fixed: summary.data.fixedExpenses
      .map((e) => ({
        id: e.id,
        description: e.description,
        cardName: e.cardName,
        cardColor: e.cardColor,
        paymentMethod: e.paymentMethod,
        category: e.categoryName,
        categoryIcon: e.categoryIcon,
        categoryColor: e.categoryColor,
        subcategory: e.subcategoryName,
        dueDay: e.dueDay,
        amount: e.monthlyAmount,
      }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
    incomes: summary.data.incomes
      .map((i) => ({
        id: i.id,
        date: i.date,
        description: i.description,
        type: PT_INCOME_TYPE[i.type] ?? i.type,
        amount: i.amount,
      }))
      .sort((a, b) => (a.date < b.date ? 1 : -1)),
    receivables: [
      ...summary.data.cashReceivables.map((r) => ({
        id: `c-${r.id}`,
        date: r.expectedPaymentMonth,
        description: r.description,
        kind: "cash" as const,
        cardName: null,
        cardColor: null,
        method: PT_METHOD[r.loanType] ?? r.loanType,
        amount: r.amount,
        status: r.isPaid ? ("paid" as const) : ("pending" as const),
        paidOn: r.actualPaymentDate,
      })),
      ...summary.data.creditReceivables.map((r) => ({
        id: `cr-${r.id}`,
        date: r.purchaseDate,
        description: r.description,
        kind: "credit" as const,
        cardName: r.cardName,
        cardColor: r.cardColor,
        method: r.totalParcels > 1 ? `${r.totalParcels}×` : "single",
        amount: r.parcelValue,
        status: "pending" as const,
        paidOn: null,
      })),
    ].sort((a, b) => (a.date < b.date ? 1 : -1)),
  };

  const balanceNum = Number(summary.balance);
  const prev = shiftMonth(reference, -1);
  const next = shiftMonth(reference, 1);

  return (
    <div className="enter flex flex-col">
      {/* ── top bar ─────────────────────────────────────────────────── */}
      <div className="border-border bg-background/95 supports-backdrop-blur:bg-background/70 flex shrink-0 items-center justify-end gap-4 border-b px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground/70 mr-2 font-mono text-[11px] tracking-[0.16em]">
            {formatMonthShort(reference)}
          </span>
          <Link
            href={`/month/${prev}`}
            aria-label={`previous month (${formatMonthShort(prev)})`}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.7} />
          </Link>
          <h1 className="text-foreground min-w-[180px] text-center text-[14px] font-semibold tracking-tight capitalize">
            {formatMonthLong(reference)}
          </h1>
          <Link
            href={`/month/${next}`}
            aria-label={`next month (${formatMonthShort(next)})`}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronRight className="size-3.5" strokeWidth={1.7} />
          </Link>
        </div>
      </div>

      {/* ── manuscript title ───────────────────────────────────────── */}
      <div className="border-border bg-background/60 flex shrink-0 items-center justify-between gap-4 border-b px-6 py-5">
        <div className="flex items-center gap-4">
          <MoonForMonth reference={reference} />
          <SnapshotBadge
            reference={reference}
            isPastMonth={reference < currentMonthRef()}
            snapshot={
              summary.historicalSnapshot
                ? {
                    totalIncomes: summary.historicalSnapshot.totalIncomes,
                    totalExpenses: summary.historicalSnapshot.totalExpenses,
                  }
                : null
            }
          />
          <div className="flex items-baseline gap-3">
            <h2 className="font-display text-foreground text-[40px] leading-none font-light tracking-[-0.02em] capitalize italic md:text-[52px]">
              {formatMonthLong(reference).split(" ")[0]}
            </h2>
            <span className="font-display text-muted-foreground/70 text-[26px] leading-none font-light tracking-tight tabular-nums md:text-[34px]">
              {reference.slice(0, 4)}
            </span>
          </div>
        </div>
        <span className="text-muted-foreground/60 hidden items-center gap-2 font-mono text-[11px] tracking-[0.22em] sm:flex">
          <PixelStarSmall size={6} className="text-primary/70" />
          {formatMonthShort(reference)} · log
        </span>
      </div>

      {/* ── kpi strip ───────────────────────────────────────────────── */}
      <div className="border-border grid shrink-0 grid-cols-2 border-b md:grid-cols-5">
        <Kpi
          label="balance"
          value={summary.balance}
          accent={balanceNum < 0 ? "destructive" : "primary"}
          highlight
        />
        <Kpi
          label="expenses"
          value={summary.totalExpenses}
          delta={expenseDelta}
          deltaTone="inverted"
          accent="muted"
        />
        <Kpi
          label="last month save"
          value={previousMonthAgg.balance}
          delta={lastMonthSaveDelta}
          deltaTone="positive"
          accent="muted"
        />
        <Kpi
          label="incomes"
          value={summary.totalIncomes}
          delta={incomeDelta}
          deltaTone="positive"
          accent="success"
        />
        <Kpi label="liquid savings" value={totalLiquidSavings} accent="muted" />
      </div>

      {summary.isHistoricalLocked ? (
        <HistoricalLock reference={reference} />
      ) : (
        <>
          {/* ── mid grid: trend | breakdowns | activity ─────────────────── */}
          <div className="grid min-h-0 shrink-0 grid-cols-1 lg:grid-cols-12">
            {/* expenses breakdown — cash + credit grouped, like the spreadsheet */}
            <div className="border-border flex min-h-0 flex-col lg:col-span-7 lg:border-r">
              <PanelHeader
                title="expenses"
                right={
                  <span className="numeric text-primary text-[13px] font-semibold tabular-nums">
                    {formatCurrency(String(paymentMethodTotal))}
                  </span>
                }
              />
              <div className="flex flex-col gap-5 px-5 py-4">
                {/* cash group — pix / debit / cash are payment methods of
                cash_expenses; "fixed" is the recurring fixed_expenses
                paid in cash (subscriptions, gym, etc.) shown side by
                side so they don't get lumped into the cash bucket. */}
                <div className="flex flex-col gap-2.5">
                  <GroupHeader
                    label="cash"
                    total={
                      cashByMethod.pix + cashByMethod.debit + cashByMethod.cash + fixedCashTotal
                    }
                  />
                  <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                    <Tile label="pix" value={cashByMethod.pix} />
                    <Tile label="debit" value={cashByMethod.debit} />
                    <Tile label="cash" value={cashByMethod.cash} />
                    <Tile label="fixed" value={fixedCashTotal} />
                  </div>
                </div>

                {/* credit group */}
                <div className="flex flex-col gap-2.5">
                  <GroupHeader
                    label="credit"
                    total={Number(summary.totalCreditExpenses) + fixedCreditTotal}
                  />
                  {creditByCard.length === 0 ? (
                    <p className="text-muted-foreground py-2 text-[12px]">
                      no credit charges this month.
                    </p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                      {creditByCard.map((c) => (
                        <Tile
                          key={c.id}
                          label={c.name}
                          value={c.total}
                          accent
                          color={c.color}
                          billTotal={c.receivable > 0 ? c.billTotal : undefined}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* expenses by category */}
            <div className="border-border lg:col-span-5">
              <PanelHeader
                title="by category"
                subtitle="cash + credit + recurring"
                right={
                  topCategory && (
                    <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wider">
                      <span className="text-foreground">{topCategory.label}</span>{" "}
                      <span className="numeric text-foreground/70 tabular-nums">
                        {formatCurrency(String(topCategory.total))}
                      </span>
                    </span>
                  )
                }
              />
              <div className="max-h-[300px] overflow-auto px-2 py-2">
                <CategoryBreakdownChart data={categoryChartData} />
              </div>
            </div>
          </div>

          {/* shared total — spans both panels above */}
          <div className="border-border bg-primary/[0.05] flex shrink-0 items-baseline justify-between border-t border-b px-5 py-3">
            <span className="text-foreground/70 font-mono text-[11.5px] tracking-[0.22em]">
              total expenses
            </span>
            <span className="numeric text-primary text-[16px] font-semibold tabular-nums">
              {formatCurrency(String(paymentMethodTotal))}
            </span>
          </div>

          {/* ── detail tabs (bottom, fills rest) ────────────────────────── */}
          <DetailTabs
            lists={detailLists}
            totals={{
              cash: summary.totalCashExpenses,
              credit: summary.totalCreditExpenses,
              fixed: summary.totalFixedExpenses,
              incomes: summary.totalIncomes,
              receivables: summary.totalReceivables,
            }}
          />
        </>
      )}
    </div>
  );
}

function HistoricalLock({ reference }: { reference: MonthRef }) {
  return (
    <div className="border-border flex min-h-[280px] flex-col items-center justify-center gap-3 border-b px-6 py-12 text-center">
      <span className="bg-muted text-muted-foreground inline-flex size-10 items-center justify-center rounded-full">
        <PixelMoonFull size={14} className="text-primary/60" />
      </span>
      <h3 className="font-display text-foreground text-[18px] font-light tracking-tight italic">
        historical records
      </h3>
      <p className="text-muted-foreground/85 max-w-md text-[13px] leading-relaxed">
        no per-transaction detail for {formatMonthLong(reference)} — this month was seeded from the
        spreadsheet before active tracking began. the totals above already count toward the
        cumulative balance, but you can't edit records here.
      </p>
      <span className="text-muted-foreground/60 mt-1 font-mono text-[10px] tracking-[0.18em] uppercase">
        snapshot · locked
      </span>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  small helpers                                                          */
/* ────────────────────────────────────────────────────────────────────── */

/**
 * Picks a moon glyph for the manuscript title based on the reference month.
 * Even months get a full moon, odd months a crescent — gives each spread of
 * months a small visual tell without computing real lunar phases.
 */
function MoonForMonth({ reference }: { reference: string }) {
  const month = Number(reference.slice(5, 7));
  const isFull = month % 2 === 0;
  const Glyph = isFull ? PixelMoonFull : PixelMoonCrescent;
  return (
    <div className="relative">
      <Glyph
        size={44}
        className="text-foreground/85 drop-shadow-[0_0_14px_oklch(0.65_0.10_200/0.60)]"
      />
      <PixelStarSmall
        size={5}
        className="text-primary/80 absolute -top-1 -right-1.5 animate-pulse"
      />
    </div>
  );
}

function GroupHeader({ label, total }: { label: string; total: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-foreground/85 text-[13px] font-medium tracking-tight">{label}</span>
      <span className="numeric text-primary text-[14px] font-medium tabular-nums">
        {formatCurrency(String(total))}
      </span>
    </div>
  );
}

function Tile({
  label,
  value,
  accent,
  color,
  billTotal,
}: {
  label: string;
  value: number;
  accent?: boolean;
  color?: string;
  /** When set, displayed (faded but readable) next to the main value
   *  — used for credit cards to surface "the total that'll show on the
   *  bill" once receivables are added back to the user's own spend. */
  billTotal?: number;
}) {
  const isZero = value === 0;
  const dotHex = color;
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-0.5 rounded-md border px-3 py-2 transition-colors",
        accent
          ? "bg-primary/[0.05] border-primary/[0.18] hover:border-primary/[0.32]"
          : "bg-card/60 hover:border-border-strong",
        isZero && "opacity-60",
      )}
    >
      <span
        className={cn(
          "flex items-center gap-1.5 truncate font-mono text-[11px] tracking-[0.16em]",
          accent ? "text-primary/80" : "text-muted-foreground",
        )}
      >
        {dotHex && (
          <span
            aria-hidden
            className="block size-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: dotHex }}
          />
        )}
        <span className="truncate">{label}</span>
      </span>
      <span className="flex items-baseline justify-between gap-1.5">
        <span
          className={cn(
            "numeric text-[14px] tabular-nums",
            isZero ? "text-muted-foreground/70" : "text-foreground",
          )}
        >
          {formatCurrency(String(value))}
        </span>
        {billTotal !== undefined && (
          <span
            className="text-muted-foreground/75 numeric truncate font-mono text-[10.5px] tabular-nums"
            title={`bill total — includes receivables: ${formatCurrency(String(billTotal))}`}
          >
            bill {formatCurrency(String(billTotal))}
          </span>
        )}
      </span>
    </div>
  );
}

function pctDelta(prev: string, curr: string): number {
  const p = Number(prev);
  const c = Number(curr);
  if (p <= 0) return 0;
  return ((c - p) / p) * 100;
}

function PanelHeader({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">{title}</h2>
        {subtitle && <span className="text-muted-foreground text-[11px]">{subtitle}</span>}
      </div>
      {right}
    </div>
  );
}

function Kpi({
  label,
  value,
  delta,
  deltaTone = "positive",
  accent = "muted",
  highlight,
}: {
  label: string;
  value: string;
  delta?: number;
  deltaTone?: "positive" | "inverted";
  accent?: "muted" | "primary" | "success" | "destructive";
  highlight?: boolean;
}) {
  const num = Number(value);
  const showDelta = delta !== undefined && Number.isFinite(delta) && delta !== 0;
  const deltaPositive = (delta ?? 0) >= 0;
  const isGood = deltaTone === "positive" ? deltaPositive : !deltaPositive;
  const deltaClass = !showDelta ? "" : isGood ? "text-success" : "text-destructive";

  return (
    <div
      className={cn(
        "border-border flex flex-col gap-2 border-r px-6 py-5 last:border-r-0",
        highlight && "bg-primary/[0.05]",
      )}
    >
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.2em]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "numeric text-[24px] leading-none font-semibold tracking-tight",
            accent === "primary" && "text-primary",
            accent === "success" && "text-success",
            accent === "destructive" && "text-destructive",
            accent === "muted" && "text-foreground",
            num < 0 && accent !== "destructive" && "text-destructive",
          )}
        >
          {formatCurrency(value)}
        </span>
        {showDelta && (
          <span className={cn("inline-flex items-baseline gap-0.5 text-[12px]", deltaClass)}>
            {deltaPositive ? (
              <ArrowUpRight className="size-3 self-center" strokeWidth={2} />
            ) : (
              <ArrowDownRight className="size-3 self-center" strokeWidth={2} />
            )}
            <span className="numeric">{Math.abs(delta!).toFixed(1)}%</span>
          </span>
        )}
      </div>
    </div>
  );
}

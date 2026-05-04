import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TrendChart } from "@/components/charts/trend-chart";
import {
  PixelComet,
  PixelPlanet,
  PixelStarSmall,
} from "@/components/decorative/pixel-icons";
import { cumulativeBalance, type HistoricalSnapshot } from "@/lib/finance/aggregate";
import { currentMonthRef, formatMonthShort, type MonthRef } from "@/lib/finance/month";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { listSnapshots } from "@/lib/queries/snapshots";
import { loadYear } from "@/lib/queries/year";
import { cn, formatCurrency } from "@/lib/utils";

type Params = { year: string };

export default async function YearPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const parsed = Number(year);
  if (!/^\d{4}$/.test(year) || Number.isNaN(parsed)) {
    redirect(`/year/${new Date().getFullYear()}`);
  }

  const [summary, dataset, snapshotRows] = await Promise.all([
    loadYear(parsed),
    loadFullDataset(),
    listSnapshots(),
  ]);
  const inputs = toAggregateInputs(dataset);
  const snapshots: HistoricalSnapshot[] = snapshotRows.map((s) => ({
    referenceMonth: s.referenceMonth.toString().slice(0, 10),
    totalIncomes: s.totalIncomes,
    totalExpenses: s.totalExpenses,
  }));

  const trendData = summary.months.map((m) => ({
    label: formatMonthShort(m.reference).split("/")[0],
    net: Number(m.balance),
    cumulative: Number(cumulativeBalance(inputs, m.reference as MonthRef, snapshots)),
    incomes: Number(m.totalIncomes),
    expenses: Number(m.totalExpenses),
  }));

  const yearEndCumulative = trendData[trendData.length - 1]?.cumulative ?? 0;
  const yearStartCumulative =
    summary.months[0] != null
      ? Number(
          cumulativeBalance(
            inputs,
            previousMonthRef(summary.months[0].reference as MonthRef),
            snapshots,
          ),
        )
      : 0;
  const yearDelta = yearEndCumulative - yearStartCumulative;

  // YTD balance: sum of (incomes − expenses) for months elapsed within
  // *this year only*. Differs from the global cumulative — it ignores
  // anything before january of the viewed year. Current year clips at the
  // current month so forecast months don't inflate the figure.
  const today = currentMonthRef();
  const [currentYear, currentMonthNum] = today.split("-").map(Number);
  const monthCutoff = summary.year === currentYear ? currentMonthNum : 12;
  let ytdIncomes = 0;
  let ytdExpenses = 0;
  for (const m of summary.months) {
    const monthNum = Number(m.reference.split("-")[1]);
    if (monthNum > monthCutoff) continue;
    ytdIncomes += Number(m.totalIncomes);
    ytdExpenses += Number(m.totalExpenses);
  }
  const ytdBalance = (ytdIncomes - ytdExpenses).toFixed(2);
  const ytdLabel =
    summary.year === currentYear
      ? `jan → ${formatMonthShort(today).split("/")[0]}`
      : "full year";

  // Build month rows with deltas vs the previous month.
  const monthRows = summary.months.map((m, idx) => {
    const prev = idx > 0 ? summary.months[idx - 1]! : null;
    const incomeDelta = prev ? pctDelta(prev.totalIncomes, m.totalIncomes) : null;
    const expenseDelta = prev ? pctDelta(prev.totalExpenses, m.totalExpenses) : null;
    const isEmpty = Number(m.totalIncomes) === 0 && Number(m.totalExpenses) === 0;
    return {
      reference: m.reference,
      monthLabel: formatMonthShort(m.reference).split("/")[0],
      totalIncomes: m.totalIncomes,
      totalExpenses: m.totalExpenses,
      balance: m.balance,
      incomeDelta,
      expenseDelta,
      isEmpty,
    };
  });

  // Compose a four-digit year out of two halves so we can render the leading
  // pair in a heavier weight while the trailing pair stays light — a small
  // typographic move that gives the hero number some optical drama.
  const yearStr = String(summary.year);
  const headPair = yearStr.slice(0, 2);
  const tailPair = yearStr.slice(2);

  return (
    <div className="enter flex h-full min-h-0 flex-col overflow-auto">
      {/* ── hero ────────────────────────────────────────────────────── */}
      <div className="relative isolate shrink-0 overflow-hidden">
        {/* ambient glows that only show in the hero */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 -z-10 opacity-80"
          style={{
            background:
              "radial-gradient(circle at 0% 0%, oklch(0.65 0.10 200 / 0.10), transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.65 0.06 325 / 0.10), transparent 55%)",
          }}
        />
        {/* corner decorations */}
        <div
          aria-hidden
          className="text-primary/40 absolute top-4 right-6 hidden md:block"
        >
          <PixelPlanet size={18} />
        </div>
        <div
          aria-hidden
          className="text-primary/30 absolute bottom-3 left-5 hidden md:block"
        >
          <PixelComet size={14} />
        </div>

        <div className="border-border flex flex-col gap-4 border-b px-6 py-7 md:flex-row md:items-end md:justify-between md:py-9">
          {/* left: hero number */}
          <div className="flex items-end gap-4 md:gap-6">
            <Link
              href={`/year/${summary.year - 1}`}
              aria-label={`previous year (${summary.year - 1})`}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground mb-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
            >
              <ChevronLeft className="size-4" strokeWidth={1.6} />
            </Link>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground/80 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.32em] uppercase">
                <PixelStarSmall size={5} className="text-primary" />
                annual ledger
              </span>
              <h1 className="font-display text-foreground flex items-baseline gap-1 leading-none tracking-[-0.04em]">
                <span className="text-[72px] font-light italic md:text-[112px]">
                  {headPair}
                </span>
                <span className="text-primary/85 text-[72px] font-medium italic md:text-[112px]">
                  {tailPair}
                </span>
              </h1>
              <span className="text-muted-foreground/70 mt-1 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                jan {summary.year} → dec {summary.year}
              </span>
            </div>
            <Link
              href={`/year/${summary.year + 1}`}
              aria-label={`next year (${summary.year + 1})`}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground mb-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
            >
              <ChevronRight className="size-4" strokeWidth={1.6} />
            </Link>
          </div>

          {/* right: net delta panel */}
          <div className="flex flex-col items-start md:items-end">
            <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-[0.22em] uppercase">
              net for the year
            </span>
            <span
              className={cn(
                "numeric mt-1 inline-flex items-baseline gap-1.5 text-[20px] font-semibold tabular-nums md:text-[24px]",
                yearDelta < 0 ? "text-destructive" : "text-success",
              )}
            >
              {yearDelta >= 0 ? (
                <ArrowUpRight aria-hidden className="size-4 self-center" strokeWidth={2} />
              ) : (
                <ArrowDownRight aria-hidden className="size-4 self-center" strokeWidth={2} />
              )}
              {formatCurrency(Math.abs(yearDelta))}
            </span>
            <span className="text-muted-foreground/60 mt-0.5 font-mono text-[10px] tracking-[0.18em]">
              vs {summary.year - 1} year-end
            </span>
          </div>
        </div>
      </div>

      {/* ── kpi strip ───────────────────────────────────────────────── */}
      <div className="border-border grid shrink-0 grid-cols-3 border-b">
        <YearKpi label="incomes" value={summary.totalIncomes} accent="success" />
        <YearKpi label="expenses" value={summary.totalExpenses} accent="muted" />
        <YearKpi
          label="balance"
          value={ytdBalance}
          hint={ytdLabel}
          accent={Number(ytdBalance) < 0 ? "destructive" : "primary"}
          highlight
        />
      </div>

      {/* ── trend (full width, expanded) ────────────────────────────── */}
      <div className="border-border flex shrink-0 flex-col border-b">
        <PanelHeader
          title="trend"
          subtitle="incomes · expenses · balance"
          legend={
            <div className="text-muted-foreground/80 hidden items-center gap-4 font-mono text-[10.5px] tracking-wider sm:flex">
              <LegendDot color="oklch(0.74 0.13 160)" label="incomes" />
              <LegendDot color="oklch(0.62 0.18 25)" label="expenses" />
              <LegendDot color="oklch(0.65 0.10 270)" label="balance" />
            </div>
          }
        />
        <div className="min-h-[420px] flex-1 px-3 pt-3 pb-4 md:px-5">
          <TrendChart
            data={trendData}
            series={["incomes", "expenses", "net"]}
            showPointLabels
            showYAxis
            tall
          />
        </div>
      </div>

      {/* ── month-by-month table ────────────────────────────────────── */}
      <div className="flex shrink-0 flex-col">
        <PanelHeader title="month by month" subtitle="incomes · expenses · balance · vs prev" />
        <div>
          <table className="w-full">
            <thead className="bg-muted/30 text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr className="border-border border-b">
                <th className="px-5 py-2 text-left font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  month
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  incomes
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  vs prev
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  expenses
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  vs prev
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  balance
                </th>
                <th className="w-10 px-3 py-2" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {monthRows.map((m) => {
                const balanceNum = Number(m.balance);
                return (
                  <tr key={m.reference} className="hover:bg-muted/40 group transition-colors">
                    <td className="px-5 py-3">
                      <Link
                        href={`/month/${m.reference}`}
                        className="block"
                        aria-label={`open ${m.monthLabel}`}
                      >
                        <span
                          className={cn(
                            "font-mono text-[12px] tracking-[0.18em] tabular-nums",
                            m.isEmpty ? "text-muted-foreground/50" : "text-foreground",
                          )}
                        >
                          {m.monthLabel}
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric text-[12.5px] tabular-nums",
                          m.isEmpty || Number(m.totalIncomes) === 0
                            ? "text-muted-foreground/40"
                            : "text-foreground",
                        )}
                      >
                        {formatCurrency(m.totalIncomes)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <DeltaCell
                        delta={m.incomeDelta}
                        tone="positive"
                        muted={m.isEmpty || Number(m.totalIncomes) === 0}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric text-[12.5px] tabular-nums",
                          m.isEmpty || Number(m.totalExpenses) === 0
                            ? "text-muted-foreground/40"
                            : "text-foreground",
                        )}
                      >
                        {formatCurrency(m.totalExpenses)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <DeltaCell
                        delta={m.expenseDelta}
                        tone="inverted"
                        muted={m.isEmpty || Number(m.totalExpenses) === 0}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric text-[13px] font-semibold tabular-nums",
                          balanceNum < 0 && "text-destructive/90",
                          balanceNum > 0 && "text-foreground",
                          m.isEmpty && "text-muted-foreground/40",
                        )}
                      >
                        {formatCurrency(m.balance)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <Link
                        href={`/month/${m.reference}`}
                        className="text-muted-foreground/50 hover:text-foreground inline-flex"
                        aria-label="open month"
                      >
                        <ArrowUpRight className="size-3.5" strokeWidth={1.6} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function previousMonthRef(monthRef: MonthRef): MonthRef {
  const [y, m] = monthRef.split("-").map(Number);
  const total = y * 12 + (m - 1) - 1;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function pctDelta(prev: string, curr: string): number | null {
  const p = Number(prev);
  const c = Number(curr);
  if (p === 0 && c === 0) return null;
  if (p === 0) return null; // can't compare against zero baseline
  return ((c - p) / p) * 100;
}

function PanelHeader({
  title,
  subtitle,
  legend,
}: {
  title: string;
  subtitle?: string;
  legend?: React.ReactNode;
}) {
  return (
    <div className="border-border flex shrink-0 items-center justify-between gap-3 border-b px-5 py-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">{title}</h2>
        {subtitle && <span className="text-muted-foreground text-[11px]">{subtitle}</span>}
      </div>
      {legend}
    </div>
  );
}

function LegendDot({
  color,
  label,
  dashed,
}: {
  color: string;
  label: string;
  dashed?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {dashed ? (
        <span
          aria-hidden
          className="inline-block h-px w-3"
          style={{
            backgroundImage: `repeating-linear-gradient(90deg, ${color} 0, ${color} 3px, transparent 3px, transparent 6px)`,
          }}
        />
      ) : (
        <span
          aria-hidden
          className="size-2 rounded-sm"
          style={{ backgroundColor: color }}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function YearKpi({
  label,
  value,
  hint,
  accent,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "success" | "muted" | "primary" | "destructive";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border flex flex-col gap-1 border-r px-6 py-4 last:border-r-0",
        highlight && "bg-primary/[0.04]",
      )}
    >
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em]">{label}</span>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            "numeric text-[22px] font-semibold tracking-tight tabular-nums",
            accent === "success" && "text-success",
            accent === "muted" && "text-foreground",
            accent === "primary" && "text-primary",
            accent === "destructive" && "text-destructive",
          )}
        >
          {formatCurrency(value)}
        </span>
        {hint && (
          <span className="text-muted-foreground/70 font-mono text-[10px] tracking-wider">
            {hint}
          </span>
        )}
      </div>
    </div>
  );
}

function DeltaCell({
  delta,
  tone,
  muted,
}: {
  delta: number | null;
  /** "positive" → up = good (success). "inverted" → up = bad (destructive). */
  tone: "positive" | "inverted";
  muted?: boolean;
}) {
  if (muted || delta === null || !Number.isFinite(delta) || delta === 0) {
    return <span className="text-muted-foreground/40 font-mono text-[11px]">—</span>;
  }
  const goingUp = delta > 0;
  const isGood = tone === "positive" ? goingUp : !goingUp;
  return (
    <span
      className={cn(
        "inline-flex items-baseline gap-0.5 font-mono text-[11px] tabular-nums",
        isGood ? "text-success/85" : "text-destructive/85",
      )}
    >
      {goingUp ? (
        <ArrowUpRight aria-hidden className="size-3 self-center" strokeWidth={2} />
      ) : (
        <ArrowDownRight aria-hidden className="size-3 self-center" strokeWidth={2} />
      )}
      <span>{Math.abs(delta).toFixed(1)}%</span>
    </span>
  );
}

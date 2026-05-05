import { ArrowDownRight, ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TrendChart } from "@/components/charts/trend-chart";
import { PixelComet, PixelPlanet, PixelStarSmall } from "@/components/decorative/pixel-icons";
import { cumulativeBalance, type HistoricalSnapshot } from "@/lib/finance/aggregate";
import { currentMonthRef, formatMonthShort, type MonthRef } from "@/lib/finance/month";
import { listFixedIncome } from "@/lib/queries/investments";
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

  const [summary, dataset, snapshotRows, fixedIncome] = await Promise.all([
    loadYear(parsed),
    loadFullDataset(),
    listSnapshots(),
    listFixedIncome(),
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
    summary.year === currentYear ? `jan → ${formatMonthShort(today).split("/")[0]}` : "full year";

  // ── Yearly savings KPIs ───────────────────────────────────────────────
  // Counted months = elapsed months in the current year (1..currentMonth)
  // or 12 for past years, minus any month that's completely empty (no
  // incomes and no expenses). This keeps a snapshot-less, raw-less month
  // from dragging averages to zero.
  let monthsWithData = 0;
  let totalExpensesYear = 0;
  let totalSaveYear = 0;
  for (const m of summary.months) {
    const monthNum = Number(m.reference.split("-")[1]);
    if (monthNum > monthCutoff) continue;
    const inc = Number(m.totalIncomes);
    const exp = Number(m.totalExpenses);
    if (inc === 0 && exp === 0) continue;
    totalExpensesYear += exp;
    totalSaveYear += inc - exp;
    monthsWithData += 1;
  }
  const averageMonthlyExpenses = monthsWithData > 0 ? totalExpensesYear / monthsWithData : 0;
  const averageMonthlySave = monthsWithData > 0 ? totalSaveYear / monthsWithData : 0;

  // 3. Year invested: applied amounts from `fixed_income` (LCI/LCA/CDB,
  //    treasury, etc.) whose application_date falls inside the year.
  //    Liquid savings ("cofrinhos") are deliberately excluded — those are
  //    pure savings reservoirs and the user wants to read them separately.
  let yearInvested = 0;
  for (const fi of fixedIncome) {
    const yr = Number(String(fi.applicationDate).slice(0, 4));
    if (yr === summary.year) yearInvested += Number(fi.appliedAmount);
  }

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
        <div aria-hidden className="text-primary/40 absolute top-4 right-6 hidden md:block">
          <PixelPlanet size={18} />
        </div>
        <div aria-hidden className="text-primary/30 absolute bottom-3 left-5 hidden md:block">
          <PixelComet size={14} />
        </div>

        <div className="border-border flex flex-col gap-4 border-b px-4 py-5 sm:px-6 sm:py-7 md:flex-row md:items-end md:justify-between md:py-9">
          {/* left: hero number */}
          <div className="flex items-end gap-3 md:gap-6">
            <Link
              href={`/year/${summary.year - 1}`}
              aria-label={`previous year (${summary.year - 1})`}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground mb-2 inline-flex size-8 shrink-0 items-center justify-center rounded-md border transition-colors"
            >
              <ChevronLeft className="size-4" strokeWidth={1.6} />
            </Link>
            <div className="flex flex-col gap-1">
              <span className="text-muted-foreground/80 flex items-center gap-2 font-mono text-[10px] tracking-[0.28em] uppercase sm:text-[10.5px] sm:tracking-[0.32em]">
                <PixelStarSmall size={5} className="text-primary" />
                annual ledger
              </span>
              <h1 className="font-display text-foreground flex items-baseline gap-1 leading-none tracking-[-0.04em]">
                <span className="text-[52px] font-light italic sm:text-[72px] md:text-[112px]">
                  {headPair}
                </span>
                <span className="text-primary/85 text-[52px] font-medium italic sm:text-[72px] md:text-[112px]">
                  {tailPair}
                </span>
              </h1>
              <span className="text-muted-foreground/70 mt-1 font-mono text-[10px] tracking-[0.14em] uppercase sm:text-[10.5px] sm:tracking-[0.18em]">
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
            <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.22em] uppercase sm:text-[10.5px]">
              net for the year
            </span>
            <span
              className={cn(
                "numeric mt-1 inline-flex items-center gap-1.5 text-[18px] font-semibold tabular-nums sm:text-[20px] md:text-[24px]",
                yearDelta < 0 ? "text-destructive" : "text-success",
              )}
            >
              {yearDelta >= 0 ? (
                <ArrowUpRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
              ) : (
                <ArrowDownRight aria-hidden className="size-4 shrink-0" strokeWidth={2} />
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
      {/* Two rows of three. Top: the year ledger (incomes / expenses /
          balance). Bottom: the savings story (year save / avg / invested),
          marked with `groupStart` so the second row sits under a hairline
          rule that visually separates the two. */}
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
        <YearKpi
          label="avg expenses"
          value={averageMonthlyExpenses.toFixed(2)}
          hint={monthsWithData > 0 ? `over ${monthsWithData} mo` : "no data yet"}
          accent="muted"
          groupStart
        />
        <YearKpi
          label="avg save"
          value={averageMonthlySave.toFixed(2)}
          hint={monthsWithData > 0 ? `over ${monthsWithData} mo` : "no data yet"}
          accent={averageMonthlySave < 0 ? "destructive" : "primary"}
          groupStart
        />
        <YearKpi
          label="invested"
          value={yearInvested.toFixed(2)}
          hint="fixed income, by date"
          accent="muted"
          groupStart
        />
      </div>

      {/* ── trend (full width, expanded) ────────────────────────────── */}
      <div className="border-border flex shrink-0 flex-col border-b">
        <PanelHeader title="trend" subtitle="payment month · incomes · expenses · balance" />
        {/* Legend strip — its own band of breathing room above the plot,
            separated from the chart canvas by a hairline of muted border
            so the grid never feels glued to the swatches. */}
        <div className="border-border/50 bg-muted/20 flex items-center justify-end border-b px-5 py-3">
          <div className="text-muted-foreground/80 flex items-center gap-5 font-mono text-[10.5px] tracking-wider">
            <LegendDot color="oklch(0.74 0.13 160)" label="incomes" filled />
            <LegendDot color="oklch(0.62 0.18 25)" label="expenses" filled />
            <LegendDot color="oklch(0.65 0.10 270)" label="balance" filled />
          </div>
        </div>
        <div className="min-h-[340px] flex-1 px-3 pt-7 pb-5 md:px-5">
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px]">
            <thead className="bg-muted/30 text-muted-foreground sticky top-0 z-10 backdrop-blur">
              <tr className="border-border border-b">
                <th className="px-4 py-2 text-left font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  month
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  incomes
                </th>
                <th className="hidden px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase sm:table-cell">
                  vs prev
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  expenses
                </th>
                <th className="hidden px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase sm:table-cell">
                  vs prev
                </th>
                <th className="px-3 py-2 text-right font-mono text-[10.5px] font-normal tracking-[0.16em] uppercase">
                  balance
                </th>
                <th className="w-8 px-2 py-2" />
              </tr>
            </thead>
            <tbody className="divide-border divide-y">
              {monthRows.map((m) => {
                const balanceNum = Number(m.balance);
                return (
                  <tr key={m.reference} className="hover:bg-muted/40 group transition-colors">
                    <td className="px-4 py-3">
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
                          "numeric text-[12px] tabular-nums",
                          m.isEmpty || Number(m.totalIncomes) === 0
                            ? "text-muted-foreground/40"
                            : "text-foreground",
                        )}
                      >
                        {formatCurrency(m.totalIncomes)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-right sm:table-cell">
                      <DeltaCell
                        delta={m.incomeDelta}
                        tone="positive"
                        muted={m.isEmpty || Number(m.totalIncomes) === 0}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric text-[12px] tabular-nums",
                          m.isEmpty || Number(m.totalExpenses) === 0
                            ? "text-muted-foreground/40"
                            : "text-foreground",
                        )}
                      >
                        {formatCurrency(m.totalExpenses)}
                      </span>
                    </td>
                    <td className="hidden px-3 py-3 text-right sm:table-cell">
                      <DeltaCell
                        delta={m.expenseDelta}
                        tone="inverted"
                        muted={m.isEmpty || Number(m.totalExpenses) === 0}
                      />
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={cn(
                          "numeric text-[12.5px] font-semibold tabular-nums",
                          balanceNum < 0 && "text-destructive/90",
                          balanceNum > 0 && "text-foreground",
                          m.isEmpty && "text-muted-foreground/40",
                        )}
                      >
                        {formatCurrency(m.balance)}
                      </span>
                    </td>
                    <td className="px-2 py-3 text-right">
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
  filled,
}: {
  color: string;
  label: string;
  dashed?: boolean;
  /** Renders a small area swatch (filled gradient + stroke) instead of
   *  a solid square — matches the area-style series in the chart. */
  filled?: boolean;
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
      ) : filled ? (
        <span
          aria-hidden
          className="inline-block h-2.5 w-3.5 rounded-[2px]"
          style={{
            background: `linear-gradient(to bottom, color-mix(in oklab, ${color} 65%, transparent), color-mix(in oklab, ${color} 5%, transparent))`,
            borderTop: `1px solid ${color}`,
          }}
        />
      ) : (
        <span aria-hidden className="size-2 rounded-sm" style={{ backgroundColor: color }} />
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
  groupStart,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "success" | "muted" | "primary" | "destructive";
  highlight?: boolean;
  /** Marks a cell that opens the second row (savings group). Adds a
   *  hairline top border so the two semantic rows read as separate
   *  bands stacked under each other. */
  groupStart?: boolean;
}) {
  return (
    <div
      className={cn(
        "border-border flex min-w-0 flex-col gap-0.5 overflow-hidden border-r px-2 py-3 last:border-r-0 sm:px-3 sm:py-4 lg:px-5 lg:py-4",
        highlight && "bg-primary/[0.04]",
        groupStart && "border-t",
      )}
    >
      <span className="text-muted-foreground truncate font-mono text-[9.5px] tracking-[0.12em] sm:text-[10.5px] sm:tracking-[0.16em]">
        {label}
      </span>
      <span
        className={cn(
          "numeric block truncate text-[13px] font-semibold tracking-tight tabular-nums sm:text-[15px] lg:text-[20px]",
          accent === "success" && "text-success",
          accent === "muted" && "text-foreground",
          accent === "primary" && "text-primary",
          accent === "destructive" && "text-destructive",
        )}
      >
        {formatCurrency(value)}
      </span>
      {hint && (
        <span className="text-muted-foreground/70 truncate font-mono text-[8px] tracking-wide sm:text-[9.5px]">
          {hint}
        </span>
      )}
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

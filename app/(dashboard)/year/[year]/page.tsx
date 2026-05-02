import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TrendChart } from "@/components/charts/trend-chart";
import { cumulativeBalance } from "@/lib/finance/aggregate";
import { formatMonthShort, type MonthRef } from "@/lib/finance/month";
import { loadFullDataset, toAggregateInputs } from "@/lib/queries/month";
import { loadYear } from "@/lib/queries/year";
import { cn, formatCurrency } from "@/lib/utils";

type Params = { year: string };

export default async function YearPage({ params }: { params: Promise<Params> }) {
  const { year } = await params;
  const parsed = Number(year);
  if (!/^\d{4}$/.test(year) || Number.isNaN(parsed)) {
    redirect(`/year/${new Date().getFullYear()}`);
  }

  const [summary, dataset] = await Promise.all([loadYear(parsed), loadFullDataset()]);
  const inputs = toAggregateInputs(dataset);

  const trendData = summary.months.map((m) => ({
    label: formatMonthShort(m.reference).split("/")[0],
    net: Number(m.balance),
    cumulative: Number(cumulativeBalance(inputs, m.reference as MonthRef)),
  }));

  const yearEndCumulative = trendData[trendData.length - 1]?.cumulative ?? 0;
  const yearStartCumulative =
    summary.months[0] != null
      ? Number(
          cumulativeBalance(
            inputs,
            previousMonthRef(summary.months[0].reference as MonthRef),
          ),
        )
      : 0;
  const yearDelta = yearEndCumulative - yearStartCumulative;

  return (
    <div className="enter flex h-full min-h-0 flex-col">
      {/* ── top bar ─────────────────────────────────────────────────── */}
      <div className="border-border bg-background/95 supports-backdrop-blur:bg-background/70 flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3 backdrop-blur">
        <div className="flex items-center gap-2">
          <Link
            href={`/year/${summary.year - 1}`}
            aria-label={`previous year (${summary.year - 1})`}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronLeft className="size-3.5" strokeWidth={1.7} />
          </Link>
          <h1 className="text-foreground min-w-[80px] text-center text-[14px] font-semibold tracking-tight tabular-nums">
            {summary.year}
          </h1>
          <Link
            href={`/year/${summary.year + 1}`}
            aria-label={`next year (${summary.year + 1})`}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
          >
            <ChevronRight className="size-3.5" strokeWidth={1.7} />
          </Link>
          <span className="text-muted-foreground/70 ml-2 font-mono text-[11px] tracking-[0.16em]">
            annual ledger
          </span>
        </div>
        <span
          className={cn(
            "numeric text-[13px]",
            yearDelta < 0 && "text-destructive",
            yearDelta >= 0 && "text-success",
          )}
        >
          {yearDelta >= 0 ? "+" : "−"} {formatCurrency(Math.abs(yearDelta))}{" "}
          <span className="text-muted-foreground/70">net</span>
        </span>
      </div>

      {/* ── kpi strip ───────────────────────────────────────────────── */}
      <div className="border-border grid shrink-0 grid-cols-3 border-b">
        <YearKpi label="incomes" value={summary.totalIncomes} accent="success" />
        <YearKpi label="expenses" value={summary.totalExpenses} accent="muted" />
        <YearKpi
          label="balance"
          value={summary.balance}
          accent={Number(summary.balance) < 0 ? "destructive" : "primary"}
          highlight
        />
      </div>

      {/* ── trend + months ──────────────────────────────────────────── */}
      <div className="grid min-h-0 flex-1 grid-cols-1 lg:grid-cols-12">
        <div className="border-border flex min-h-0 flex-col lg:col-span-7 lg:border-r">
          <PanelHeader title="trend" subtitle="cumulative · monthly net" />
          <div className="min-h-[280px] flex-1 px-2 pt-2">
            <TrendChart data={trendData} />
          </div>
        </div>

        <div className="flex min-h-0 flex-col lg:col-span-5">
          <PanelHeader title="month by month" />
          <ul className="divide-border min-h-0 flex-1 divide-y overflow-auto">
            {summary.months.map((m) => {
              const balanceNum = Number(m.balance);
              const isEmpty = Number(m.totalIncomes) === 0 && Number(m.totalExpenses) === 0;
              const monthLabel = formatMonthShort(m.reference).split("/")[0];
              return (
                <li key={m.reference}>
                  <Link
                    href={`/month/${m.reference}`}
                    className="group hover:bg-muted/50 flex items-center gap-4 px-5 py-3 transition-colors"
                  >
                    <span
                      className={cn(
                        "w-9 font-mono text-[11.5px] tracking-[0.18em] tabular-nums",
                        isEmpty ? "text-muted-foreground/50" : "text-foreground/70",
                      )}
                    >
                      {monthLabel}
                    </span>
                    <div className="flex flex-1 items-baseline gap-4 text-[12.5px]">
                      <ColumnStat
                        label="in"
                        value={m.totalIncomes}
                        dim={isEmpty || Number(m.totalIncomes) === 0}
                      />
                      <ColumnStat
                        label="out"
                        value={m.totalExpenses}
                        dim={isEmpty || Number(m.totalExpenses) === 0}
                      />
                    </div>
                    <span
                      className={cn(
                        "numeric text-[13px] tabular-nums",
                        balanceNum < 0 && "text-destructive/85",
                        balanceNum > 0 && "text-foreground",
                        isEmpty && "text-muted-foreground/40",
                      )}
                    >
                      {formatCurrency(m.balance)}
                    </span>
                    <ArrowUpRight
                      className="text-muted-foreground/30 size-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                      strokeWidth={1.6}
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
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

function PanelHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-5 py-3">
      <div className="flex items-baseline gap-2.5">
        <h2 className="text-foreground text-[13px] font-medium tracking-tight">{title}</h2>
        {subtitle && <span className="text-muted-foreground text-[11px]">{subtitle}</span>}
      </div>
    </div>
  );
}

function YearKpi({
  label,
  value,
  accent,
  highlight,
}: {
  label: string;
  value: string;
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
      <span className="text-muted-foreground font-mono text-[11px] tracking-[0.18em]">
        {label}
      </span>
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
    </div>
  );
}

function ColumnStat({ label, value, dim }: { label: string; value: string; dim: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground/70 font-mono text-[9.5px] tracking-[0.18em]">
        {label}
      </span>
      <span
        className={cn(
          "numeric tabular-nums",
          dim ? "text-muted-foreground/40" : "text-foreground/85",
        )}
      >
        {formatCurrency(value)}
      </span>
    </span>
  );
}

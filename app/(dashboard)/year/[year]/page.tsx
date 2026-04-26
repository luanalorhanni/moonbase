import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { TrendChart } from "@/components/charts/trend-chart";
import { PixelMoonFull } from "@/components/decorative/pixel-icons";
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
            // month before year-start
            previousMonthRef(summary.months[0].reference as MonthRef),
          ),
        )
      : 0;
  const yearDelta = yearEndCumulative - yearStartCumulative;

  return (
    <div className="enter mx-auto w-full max-w-4xl px-6 pt-12 pb-24 md:pt-20">
      {/* ── header ───────────────────────────────────────────────────────── */}
      <header className="flex flex-col gap-7">
        <div className="flex items-center justify-between gap-3">
          <div className="text-muted-foreground flex items-center gap-3 font-mono text-[10px] tracking-[0.22em]">
            <span>almanac · annual ledger</span>
            <span className="bg-border-strong h-px max-w-32 flex-1" />
          </div>
          <div className="flex items-center gap-1">
            <Link
              href={`/year/${summary.year - 1}`}
              aria-label={`previous year (${summary.year - 1})`}
              className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronLeft className="size-3.5" strokeWidth={1.6} />
            </Link>
            <span className="text-muted-foreground px-2 font-mono text-[11px] tracking-[0.16em] tabular-nums">
              {summary.year}
            </span>
            <Link
              href={`/year/${summary.year + 1}`}
              aria-label={`next year (${summary.year + 1})`}
              className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground flex size-8 items-center justify-center rounded-full border transition-colors"
            >
              <ChevronRight className="size-3.5" strokeWidth={1.6} />
            </Link>
          </div>
        </div>

        <div className="flex items-end justify-between gap-6">
          <h1 className="font-display text-foreground text-[80px] leading-[0.95] font-light tracking-[-0.03em] md:text-[120px]">
            {summary.year}
            <span className="text-muted-foreground italic">.</span>
          </h1>
          <div className="hidden shrink-0 md:block">
            <PixelMoonFull size={36} className="text-foreground/40" />
          </div>
        </div>
      </header>

      {/* ── year totals ──────────────────────────────────────────────────── */}
      <section className="border-border-strong mt-14 grid gap-6 border-t pt-7 md:grid-cols-3">
        <YearStat label="incomes" value={summary.totalIncomes} tone="success" />
        <YearStat label="expenses" value={summary.totalExpenses} tone="muted" />
        <YearStat
          label="balance"
          value={summary.balance}
          tone={Number(summary.balance) < 0 ? "destructive" : "primary"}
          highlight
        />
      </section>

      {/* ── trend ────────────────────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col gap-4">
        <SectionHead
          eyebrow="trend · twelve months"
          title="the year in saving"
          aside={`${yearDelta >= 0 ? "+" : "−"} ${formatCurrency(Math.abs(yearDelta))}`}
          legend={[
            { label: "cumulative", tone: "primary" },
            { label: "monthly net", tone: "success" },
          ]}
        />
        <div className="text-foreground/80 -mx-2">
          <TrendChart data={trendData} />
        </div>
      </section>

      {/* ── month list ───────────────────────────────────────────────────── */}
      <section className="mt-16 flex flex-col gap-4">
        <SectionHead eyebrow="logbook · month by month" title="entries" />
        <ul className="divide-border-strong/60 divide-y">
          {summary.months.map((m) => {
            const balanceNum = Number(m.balance);
            const isEmpty = Number(m.totalIncomes) === 0 && Number(m.totalExpenses) === 0;
            const monthLabel = formatMonthShort(m.reference).split("/")[0];
            return (
              <li key={m.reference}>
                <Link
                  href={`/month/${m.reference}`}
                  className="group hover:bg-accent/[0.03] flex items-center gap-5 py-3.5 transition-colors"
                >
                  <span
                    className={cn(
                      "w-10 font-mono text-[11px] tracking-[0.18em] tabular-nums",
                      isEmpty ? "text-muted-foreground/40" : "text-foreground/70",
                    )}
                  >
                    {monthLabel}
                  </span>
                  <div className="flex flex-1 items-baseline gap-6 text-[13px]">
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
                      "numeric text-[14px] tabular-nums",
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
      </section>
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────── */

function previousMonthRef(monthRef: MonthRef): MonthRef {
  const [y, m] = monthRef.split("-").map(Number);
  const total = y * 12 + (m - 1) - 1;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

function YearStat({
  label,
  value,
  tone,
  highlight,
}: {
  label: string;
  value: string;
  tone: "success" | "muted" | "primary" | "destructive";
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2",
        highlight && "border-border-strong/60 rounded-2xl border px-5 py-4",
      )}
    >
      <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em]">{label}</span>
      <span
        className={cn(
          "display-numeric text-[34px] leading-none font-light tabular-nums md:text-[42px]",
          tone === "success" && "text-success/90",
          tone === "muted" && "text-foreground/85",
          tone === "primary" && "text-primary",
          tone === "destructive" && "text-destructive/85",
        )}
      >
        {formatCurrency(value)}
      </span>
    </div>
  );
}

function SectionHead({
  eyebrow,
  title,
  aside,
  legend,
}: {
  eyebrow: string;
  title: string;
  aside?: string;
  legend?: { label: string; tone: "primary" | "success" }[];
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-muted-foreground font-mono text-[10px] tracking-[0.22em]">
          {eyebrow}
        </span>
        {aside ? (
          <span className="numeric text-foreground/85 text-[15px] tabular-nums">{aside}</span>
        ) : null}
      </div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-foreground text-[26px] leading-tight font-light tracking-[-0.015em] italic">
          {title}
        </h2>
        {legend ? (
          <ul className="text-muted-foreground hidden items-baseline gap-4 font-mono text-[10px] tracking-[0.16em] sm:flex">
            {legend.map((l) => (
              <li key={l.label} className="flex items-baseline gap-1.5">
                <span
                  aria-hidden
                  className={cn(
                    "size-1.5 translate-y-[-1px] rounded-full",
                    l.tone === "primary" && "bg-primary/85",
                    l.tone === "success" && "bg-success/85",
                  )}
                />
                {l.label}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <span className="bg-border-strong h-px w-full" />
    </div>
  );
}

function ColumnStat({ label, value, dim }: { label: string; value: string; dim: boolean }) {
  return (
    <span className="flex items-baseline gap-1.5">
      <span className="text-muted-foreground/70 font-mono text-[10px] tracking-[0.18em]">
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

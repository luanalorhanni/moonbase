"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export type TrendDatum = {
  label: string;
  /** monthly net (incomes − expenses) */
  net: number;
  /** running cumulative save through end of this month */
  cumulative: number;
  /** monthly incomes — optional so legacy callers stay compatible */
  incomes?: number;
  /** monthly expenses */
  expenses?: number;
};

/**
 * Tick / label formatter — full pt-BR currency mask, e.g. 5600 → "R$ 5.600,00".
 */
const formatTick = (value: number): string =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);

const COLORS = {
  cumulative: "oklch(0.65 0.10 200)", // electric aqua
  net: "oklch(0.65 0.10 270)", // soft lunar violet — distinct from incomes
  incomes: "oklch(0.74 0.13 160)", // success-leaning green
  expenses: "oklch(0.62 0.18 25)", // warm coral (destructive-leaning)
};

const TOOLTIP_LABELS: Record<string, string> = {
  cumulative: "cumulative",
  net: "balance",
  incomes: "incomes",
  expenses: "expenses",
};

type Series = "cumulative" | "incomes" | "expenses" | "net";

/**
 * Multi-series trend chart.
 *   • cumulative — soft area, the running savings line
 *   • net — dashed monthly net (incomes − expenses)
 *   • incomes/expenses — solid lines
 *
 * Pass `series` to pick exactly which lines to render (e.g. `["expenses"]`
 * for a clean single-line view). When omitted, the legacy boolean flags
 * decide.
 */
export function TrendChart({
  data,
  series,
  showPointLabels,
  showIncomeExpense,
  showNet = true,
  showYAxis = false,
  tall = false,
}: {
  data: TrendDatum[];
  series?: Series[];
  showPointLabels?: boolean;
  /** Legacy: when true, draws the per-month incomes and expenses lines. */
  showIncomeExpense?: boolean;
  /** Legacy: when false, hides the dashed net line. Default true. */
  showNet?: boolean;
  /** When true, renders a labelled Y axis with compact currency ticks. */
  showYAxis?: boolean;
  /** Bumps the canvas to ~420px — used by the year ledger where the chart
   *  is the centerpiece. */
  tall?: boolean;
}) {
  const active: Set<Series> = series
    ? new Set(series)
    : new Set<Series>([
        "cumulative",
        ...((showIncomeExpense ? (["incomes", "expenses"] as const) : []) as Series[]),
        ...((showNet ? (["net"] as const) : []) as Series[]),
      ]);
  const height = tall ? 420 : showPointLabels ? 280 : 220;
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart
        data={data}
        margin={{
          top: showPointLabels ? 32 : 24,
          right: 24,
          bottom: 8,
          left: showYAxis ? 8 : 8,
        }}
      >
        <defs>
          <linearGradient id="trend-fill-cumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.cumulative} stopOpacity={0.32} />
            <stop offset="100%" stopColor={COLORS.cumulative} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trend-fill-incomes" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.incomes} stopOpacity={0.18} />
            <stop offset="100%" stopColor={COLORS.incomes} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trend-fill-expenses" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.expenses} stopOpacity={0.18} />
            <stop offset="100%" stopColor={COLORS.expenses} stopOpacity={0} />
          </linearGradient>
          <linearGradient id="trend-fill-net" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.net} stopOpacity={0.16} />
            <stop offset="100%" stopColor={COLORS.net} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          stroke="color-mix(in oklab, var(--border) 65%, transparent)"
          strokeDasharray="3 4"
        />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          /* Force every label to render — Recharts otherwise auto-skips
             the first tick when labels don't fit, which makes a 12-month
             chart read as if it starts at feb. */
          interval={0}
          tick={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            fill: "currentColor",
          }}
          className="text-muted-foreground"
          dy={8}
        />
        {showYAxis ? (
          <YAxis
            tickLine={false}
            axisLine={false}
            width={88}
            tickFormatter={(v: number) => formatTick(v)}
            tick={{
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              letterSpacing: "0.06em",
              fill: "currentColor",
            }}
            className="text-muted-foreground"
          />
        ) : (
          <YAxis hide />
        )}
        <Tooltip
          cursor={{ stroke: "var(--border)", strokeDasharray: "2 2" }}
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 10,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
            color: "var(--popover-foreground)",
            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
          }}
          itemStyle={{ color: "var(--popover-foreground)" }}
          labelStyle={{
            color: "var(--muted-foreground)",
            textTransform: "lowercase",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
          }}
          formatter={(value, name) => {
            const label = TOOLTIP_LABELS[String(name)] ?? String(name);
            return [formatBRL(Number(value)), label];
          }}
        />
        {active.has("cumulative") && (
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke={COLORS.cumulative}
            strokeWidth={1.5}
            fill="url(#trend-fill-cumulative)"
            dot={
              showPointLabels
                ? { r: 2.5, fill: COLORS.cumulative, stroke: "var(--background)", strokeWidth: 1 }
                : false
            }
            activeDot={{ r: 4, fill: COLORS.cumulative, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="cumulative"
                position="top"
                offset={10}
                fill={COLORS.cumulative}
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatTick(Number(v))}
              />
            )}
          </Area>
        )}

        {active.has("incomes") && (
          <Area
            type="monotone"
            dataKey="incomes"
            stroke={COLORS.incomes}
            strokeWidth={1.75}
            fill="url(#trend-fill-incomes)"
            dot={{ r: 2.5, fill: COLORS.incomes, stroke: "var(--background)", strokeWidth: 1 }}
            activeDot={{ r: 4, fill: COLORS.incomes, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="incomes"
                position="top"
                offset={10}
                fill={COLORS.incomes}
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatTick(Number(v))}
              />
            )}
          </Area>
        )}

        {active.has("expenses") && (
          <Area
            type="monotone"
            dataKey="expenses"
            stroke={COLORS.expenses}
            strokeWidth={1.75}
            fill="url(#trend-fill-expenses)"
            dot={{ r: 2.5, fill: COLORS.expenses, stroke: "var(--background)", strokeWidth: 1 }}
            activeDot={{ r: 4, fill: COLORS.expenses, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="expenses"
                position="bottom"
                offset={10}
                fill={COLORS.expenses}
                fontSize={9.5}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatTick(Number(v))}
              />
            )}
          </Area>
        )}

        {active.has("net") && (
          <Area
            type="monotone"
            dataKey="net"
            stroke={COLORS.net}
            strokeWidth={1.5}
            fill="url(#trend-fill-net)"
            dot={{ r: 2.5, fill: COLORS.net, stroke: "var(--background)", strokeWidth: 1 }}
            activeDot={{ r: 4, fill: COLORS.net, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="net"
                position="top"
                offset={8}
                fill={COLORS.net}
                fontSize={9}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatTick(Number(v))}
              />
            )}
          </Area>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  LabelList,
  Line,
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

function formatCompact(value: number): string {
  if (Math.abs(value) >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)}M`;
  }
  if (Math.abs(value) >= 1_000) {
    return `${Math.round(value / 1_000)}k`;
  }
  return String(Math.round(value));
}

const COLORS = {
  cumulative: "oklch(0.65 0.10 200)", // electric aqua
  net: "oklch(0.74 0.13 160)", // mint
  incomes: "oklch(0.74 0.13 160)", // success-leaning green
  expenses: "oklch(0.62 0.18 25)", // warm coral (destructive-leaning)
};

const TOOLTIP_LABELS: Record<string, string> = {
  cumulative: "cumulative",
  net: "this month",
  incomes: "incomes",
  expenses: "expenses",
};

/**
 * Multi-series trend chart.
 *   • cumulative — soft area, the running savings line
 *   • net — dashed monthly net (incomes − expenses)
 *   • incomes/expenses (optional) — solid lines so the user can see
 *     ganhos and gastos against each other
 *
 * `showPointLabels` places compact value labels on cumulative + visible
 * series — useful in the year ledger where 12 dots are sparse enough.
 */
export function TrendChart({
  data,
  showPointLabels,
  showIncomeExpense,
  showNet = true,
}: {
  data: TrendDatum[];
  showPointLabels?: boolean;
  /** When true, draws the per-month incomes and expenses lines. */
  showIncomeExpense?: boolean;
  /** When false, hides the dashed net line. Default true. */
  showNet?: boolean;
}) {
  return (
    <ResponsiveContainer width="100%" height={showPointLabels ? 280 : 220}>
      <ComposedChart
        data={data}
        margin={{ top: showPointLabels ? 32 : 24, right: 24, bottom: 8, left: 8 }}
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={COLORS.cumulative} stopOpacity={0.32} />
            <stop offset="100%" stopColor={COLORS.cumulative} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="oklch(1 0 0 / 0.04)" vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{
            fontSize: 10,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.12em",
            fill: "currentColor",
          }}
          className="text-muted-foreground"
          dy={8}
        />
        <YAxis hide />
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
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke={COLORS.cumulative}
          strokeWidth={1.5}
          fill="url(#trend-fill)"
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
              formatter={(v: unknown) => formatCompact(Number(v))}
            />
          )}
        </Area>

        {showIncomeExpense && (
          <Line
            type="monotone"
            dataKey="incomes"
            stroke={COLORS.incomes}
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: COLORS.incomes, stroke: "var(--background)", strokeWidth: 1 }}
            activeDot={{ r: 4, fill: COLORS.incomes, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="incomes"
                position="top"
                offset={8}
                fill={COLORS.incomes}
                fontSize={9}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatCompact(Number(v))}
              />
            )}
          </Line>
        )}

        {showIncomeExpense && (
          <Line
            type="monotone"
            dataKey="expenses"
            stroke={COLORS.expenses}
            strokeWidth={1.5}
            dot={{ r: 2.5, fill: COLORS.expenses, stroke: "var(--background)", strokeWidth: 1 }}
            activeDot={{ r: 4, fill: COLORS.expenses, stroke: "none" }}
          >
            {showPointLabels && (
              <LabelList
                dataKey="expenses"
                position="bottom"
                offset={8}
                fill={COLORS.expenses}
                fontSize={9}
                fontFamily="var(--font-mono)"
                letterSpacing="0.04em"
                formatter={(v: unknown) => formatCompact(Number(v))}
              />
            )}
          </Line>
        )}

        {showNet && (
          <Line
            type="monotone"
            dataKey="net"
            stroke={COLORS.net}
            strokeWidth={1}
            strokeDasharray="2 3"
            dot={{ r: 2, fill: COLORS.net, stroke: "none" }}
            activeDot={{ r: 3.5, fill: COLORS.net, stroke: "none" }}
          />
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}

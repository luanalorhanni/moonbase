"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
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
};

/**
 * Calm trend chart. Two layered series:
 *   • a soft area that traces the *cumulative* save through time (left axis)
 *   • a hairline that marks the *monthly net* swings (same axis)
 * No grid, no legend chrome — labels and tooltip carry the meaning.
 */
export function TrendChart({ data }: { data: TrendDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 24, right: 16, bottom: 8, left: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="oklch(0.65 0.10 200)" stopOpacity={0} />
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
          cursor={{ stroke: "oklch(1 0 0 / 0.18)", strokeDasharray: "2 2" }}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border-strong)",
            borderRadius: 10,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.04em",
          }}
          labelStyle={{
            color: "var(--muted-foreground)",
            textTransform: "lowercase",
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            letterSpacing: "0.12em",
          }}
          formatter={(value, name) => {
            const label = name === "net" ? "this month" : "cumulative";
            return [formatBRL(Number(value)), label];
          }}
        />
        <Area
          type="monotone"
          dataKey="cumulative"
          stroke="oklch(0.65 0.10 200)"
          strokeWidth={1.5}
          fill="url(#trend-fill)"
        />
        <Line
          type="monotone"
          dataKey="net"
          stroke="oklch(0.74 0.13 160)"
          strokeWidth={1}
          strokeDasharray="2 3"
          dot={{ r: 2, fill: "oklch(0.74 0.13 160)", stroke: "none" }}
          activeDot={{ r: 3.5, fill: "oklch(0.74 0.13 160)", stroke: "none" }}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

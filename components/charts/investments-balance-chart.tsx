"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export type BalanceDatum = {
  key: string;
  label: string;
  applied: number;
  gain: number;
};

/**
 * Stacked horizontal bar — applied principal (muted) + gain (primary)
 * per investment. The total bar length equals the current balance.
 */
export function InvestmentsBalanceChart({ data }: { data: BalanceDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground/70 flex h-[140px] items-center justify-center text-[12px]">
        no investments to chart yet.
      </div>
    );
  }

  // Sort by current balance desc so the biggest sits at the top.
  const sorted = [...data].sort((a, b) => b.applied + b.gain - (a.applied + a.gain));
  const height = sorted.length * 26 + 16;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 4, right: 90, bottom: 4, left: 0 }}
        barCategoryGap={6}
        stackOffset="sign"
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="label"
          tickLine={false}
          axisLine={false}
          width={130}
          interval={0}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-foreground"
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11,
            color: "var(--popover-foreground)",
            boxShadow: "0 4px 12px rgb(0 0 0 / 0.08)",
          }}
          itemStyle={{ color: "var(--popover-foreground)" }}
          labelStyle={{ color: "var(--popover-foreground)", fontWeight: 500 }}
          formatter={(value, name) => [
            formatBRL(Number(value)),
            name === "applied" ? "applied" : "gain",
          ]}
          cursor={{ fill: "var(--muted)", opacity: 0.35 }}
        />
        <Bar
          dataKey="applied"
          stackId="balance"
          fill="oklch(0.72 0.05 265)"
          radius={[0, 0, 0, 0]}
        />
        <Bar
          dataKey="gain"
          stackId="balance"
          radius={[0, 999, 999, 0]}
          label={{
            position: "right",
            fontSize: 10.5,
            fill: "currentColor",
            className: "fill-foreground/85 font-mono tabular-nums",
            formatter: (label) => {
              if (label === undefined || label === null) return "";
              const idx = sorted.findIndex((d) => d.gain === Number(label));
              const datum = idx >= 0 ? sorted[idx] : null;
              const total = datum ? datum.applied + datum.gain : Number(label);
              return formatBRL(total);
            },
          }}
        >
          {sorted.map((d) => (
            <Cell key={d.key} fill={d.gain >= 0 ? "oklch(0.78 0.09 200)" : "oklch(0.55 0.20 20)"} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

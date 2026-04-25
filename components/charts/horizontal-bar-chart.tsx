"use client";

import { Bar, BarChart, Cell, ResponsiveContainer, XAxis, YAxis } from "recharts";

const TAILWIND_COLOR_TO_HEX: Record<string, string> = {
  red: "#ef4444",
  orange: "#f97316",
  yellow: "#facc15",
  green: "#22c55e",
  blue: "#3b82f6",
  purple: "#a855f7",
  pink: "#ec4899",
  brown: "#b45309",
  gray: "#9ca3af",
};

const FALLBACK = "oklch(0.55 0.15 260)";

export type BarDatum = {
  key: string;
  label: string;
  total: string;
  color?: string;
};

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export function HorizontalBarChart({ data }: { data: BarDatum[] }) {
  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-48 items-center justify-center text-sm">
        Sem dados para exibir.
      </div>
    );
  }

  const chartData = data.map((d) => ({
    name: d.label,
    value: Number(d.total),
    fill: d.color ? (TAILWIND_COLOR_TO_HEX[d.color] ?? FALLBACK) : FALLBACK,
  }));

  const height = Math.max(160, chartData.length * 36 + 24);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart
        data={chartData}
        layout="vertical"
        margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
      >
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 12, fill: "currentColor" }}
          className="text-muted-foreground"
        />
        <Bar
          dataKey="value"
          radius={[0, 4, 4, 0]}
          label={{
            position: "right",
            formatter: (label) => (label === undefined ? "" : formatBRL(Number(label))),
            fontSize: 11,
            fill: "currentColor",
            className: "fill-foreground",
          }}
        >
          {chartData.map((d, i) => (
            <Cell key={i} fill={d.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
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

export type YearChartDatum = {
  label: string;
  incomes: number;
  expenses: number;
};

export function YearBarChart({ data }: { data: YearChartDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-muted-foreground"
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => formatBRL(v)}
          tick={{ fontSize: 11, fill: "currentColor" }}
          className="text-muted-foreground"
          width={70}
        />
        <Tooltip
          formatter={(value) => formatBRL(Number(value))}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 8,
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)" }}
        />
        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        <Bar dataKey="incomes" name="incomes" fill="oklch(0.74 0.13 160)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="expenses" name="expenses" fill="oklch(0.82 0.13 78)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

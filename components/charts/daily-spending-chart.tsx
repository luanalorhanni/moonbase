"use client";

import {
  Bar,
  BarChart,
  Cell,
  ReferenceLine,
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

export type DailyDatum = { day: number; spent: number };

export function DailySpendingChart({
  data,
  dailyAvg,
  todayDay,
}: {
  data: DailyDatum[];
  dailyAvg?: number;
  todayDay?: number;
}) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: 0 }}>
        <XAxis
          dataKey="day"
          tickLine={false}
          axisLine={false}
          interval={2}
          tick={{ fontSize: 10, fill: "currentColor" }}
          className="text-muted-foreground"
          height={20}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => (v === 0 ? "" : formatBRL(v))}
          tick={{ fontSize: 10, fill: "currentColor" }}
          className="text-muted-foreground"
          width={56}
        />
        <Tooltip
          formatter={(v) => [formatBRL(Number(v)), "spent"]}
          contentStyle={{
            background: "var(--card)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            fontSize: 11,
          }}
          labelFormatter={(label) => `day ${label}`}
          cursor={{ fill: "var(--muted)", opacity: 0.4 }}
        />
        {dailyAvg !== undefined && dailyAvg > 0 && (
          <ReferenceLine
            y={dailyAvg}
            stroke="var(--muted-foreground)"
            strokeDasharray="2 4"
            strokeOpacity={0.5}
            label={{
              value: "daily avg need",
              position: "right",
              fontSize: 9,
              fill: "var(--muted-foreground)",
            }}
          />
        )}
        <Bar dataKey="spent" radius={[2, 2, 0, 0]}>
          {data.map((d) => (
            <Cell
              key={d.day}
              fill={
                todayDay && d.day === todayDay
                  ? "var(--primary)"
                  : todayDay && d.day > todayDay
                    ? "color-mix(in oklab, var(--primary) 25%, transparent)"
                    : "color-mix(in oklab, var(--primary) 60%, transparent)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

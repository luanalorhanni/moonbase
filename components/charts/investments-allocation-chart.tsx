"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

import { cn } from "@/lib/utils";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

export type AllocationDatum = {
  key: string;
  label: string;
  value: number;
  color: string;
};

/**
 * Compact donut chart for showing allocation breakdowns (e.g. liquid vs
 * fixed, or per-bank). Renders nothing when total = 0.
 */
export function InvestmentsAllocationChart({
  data,
  caption,
}: {
  data: AllocationDatum[];
  caption?: string;
}) {
  const total = data.reduce((acc, d) => acc + d.value, 0);
  if (total === 0) {
    return (
      <div className="text-muted-foreground/70 flex h-[140px] items-center justify-center text-[12px]">
        nothing allocated yet.
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              innerRadius={42}
              outerRadius={64}
              paddingAngle={2}
              stroke="var(--background)"
              strokeWidth={2}
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [formatBRL(Number(v)), "balance"]}
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
              cursor={false}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-muted-foreground font-mono text-[9.5px] tracking-[0.16em] uppercase">
            total
          </span>
          <span className="numeric text-foreground text-[14px] font-semibold tabular-nums">
            {formatBRL(total)}
          </span>
        </div>
      </div>

      <ul className="flex flex-1 flex-col gap-1.5">
        {data
          .slice()
          .sort((a, b) => b.value - a.value)
          .map((d) => {
            const pct = (d.value / total) * 100;
            return (
              <li key={d.key} className="flex items-center gap-2 text-[12px]">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-sm"
                  style={{ backgroundColor: d.color }}
                />
                <span className="text-foreground truncate">{d.label}</span>
                <span className="text-muted-foreground/70 font-mono text-[10.5px] tabular-nums">
                  {pct.toFixed(0)}%
                </span>
                <span
                  className={cn(
                    "numeric text-foreground ml-auto font-mono text-[11.5px] tabular-nums",
                  )}
                >
                  {formatBRL(d.value)}
                </span>
              </li>
            );
          })}
        {caption && (
          <li className="text-muted-foreground/60 mt-1 text-[10.5px] italic">{caption}</li>
        )}
      </ul>
    </div>
  );
}

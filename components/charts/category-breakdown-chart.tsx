"use client";

import { ChevronDown, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CategoryIcon } from "@/components/ui/category-icon";

const formatBRL = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

// Electric Aqua fading into Lavender Grey.
const BAR_FROM = "oklch(0.78 0.09 200)";
const BAR_TO = "oklch(0.72 0.05 265)";

export type CategoryDatum = {
  key: string;
  label: string;
  total: number;
  icon?: string | null;
  color?: string | null;
};

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  iconMap?: Map<string, { icon?: string | null; color?: string | null }>;
  axisWidth?: number;
};

function CategoryTick({ x = 0, y = 0, payload, iconMap, axisWidth = 150 }: TickProps) {
  const label = payload?.value ?? "";
  const meta = iconMap?.get(label);
  const hasIcon = Boolean(meta?.icon);
  const foWidth = axisWidth - 8;
  return (
    <g transform={`translate(${x},${y})`}>
      {hasIcon ? (
        <foreignObject x={-axisWidth} y={-10} width={foWidth} height={20}>
          <div className="text-foreground flex items-center justify-end gap-1.5 pr-1 text-[11px] leading-5">
            <CategoryIcon icon={meta?.icon} color={meta?.color ?? undefined} size={12} />
            <span className="truncate">{label}</span>
          </div>
        </foreignObject>
      ) : (
        <text
          x={-8}
          y={0}
          dy={4}
          textAnchor="end"
          fontSize={11}
          fill="currentColor"
          className="text-foreground"
        >
          {label}
        </text>
      )}
    </g>
  );
}

const VISIBLE_DEFAULT = 6;

export function CategoryBreakdownChart({
  data,
  visibleCount = VISIBLE_DEFAULT,
}: {
  data: CategoryDatum[];
  /** How many categories to show before the "more" toggle. Default 6. */
  visibleCount?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 480);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  if (data.length === 0) {
    return (
      <div className="text-muted-foreground flex h-[180px] items-center justify-center text-[12px]">
        no expenses recorded for this month yet.
      </div>
    );
  }

  const axisWidth = narrow ? 108 : 150;
  const rightMargin = narrow ? 56 : 76;

  const sorted = [...data].sort((a, b) => b.total - a.total);
  const visible = expanded ? sorted : sorted.slice(0, visibleCount);
  const hidden = sorted.length - visibleCount;
  const hiddenTotal = sorted.slice(visibleCount).reduce((acc, c) => acc + c.total, 0);
  const chartHeight = visible.length * 26 + 16;
  const iconMap = new Map(visible.map((d) => [d.label, { icon: d.icon, color: d.color }]));

  return (
    <div className="flex flex-col gap-1">
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart
          data={visible}
          layout="vertical"
          margin={{ top: 4, right: rightMargin, bottom: 4, left: 0 }}
          barCategoryGap={6}
        >
          <defs>
            <linearGradient id="cat-bar" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor={BAR_FROM} stopOpacity={1} />
              <stop offset="100%" stopColor={BAR_TO} stopOpacity={1} />
            </linearGradient>
          </defs>
          <XAxis type="number" hide />
          <YAxis
            type="category"
            dataKey="label"
            tickLine={false}
            axisLine={false}
            width={axisWidth}
            interval={0}
            tick={<CategoryTick iconMap={iconMap} axisWidth={axisWidth} />}
          />
          <Tooltip
            formatter={(v) => [formatBRL(Number(v)), "spent"]}
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
            cursor={{ fill: "var(--muted)", opacity: 0.35 }}
          />
          <Bar
            dataKey="total"
            radius={[0, 999, 999, 0]}
            fill="url(#cat-bar)"
            stroke={BAR_FROM}
            strokeOpacity={0.3}
            strokeWidth={0.5}
            label={{
              position: "right",
              fontSize: 10.5,
              fill: "currentColor",
              className: "fill-foreground/85 font-mono tabular-nums",
              formatter: (label) => (label === undefined ? "" : formatBRL(Number(label))),
            }}
          />
        </BarChart>
      </ResponsiveContainer>

      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="border-border-strong text-muted-foreground hover:bg-primary/[0.06] hover:text-primary mx-3 mb-1 flex items-center justify-between gap-2 rounded-md border border-dashed px-3 py-1.5 text-[11px] transition-colors"
        >
          <span className="flex items-center gap-1.5">
            {expanded ? (
              <ChevronDown className="size-3" strokeWidth={1.8} />
            ) : (
              <Plus className="size-3" strokeWidth={1.8} />
            )}
            <span>
              {expanded
                ? "show less"
                : `${hidden} more ${hidden === 1 ? "category" : "categories"}`}
            </span>
          </span>
          {!expanded && (
            <span className="numeric text-muted-foreground/70 tabular-nums">
              {formatBRL(hiddenTotal)}
            </span>
          )}
        </button>
      )}
    </div>
  );
}

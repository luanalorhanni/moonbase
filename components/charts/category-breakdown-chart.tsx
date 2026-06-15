"use client";

import { ChevronDown, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { CategoryIcon } from "@/components/ui/category-icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FALLBACK_CATEGORY_COLOR = "oklch(0.62 0.14 255)";

function subBarBackground(color?: string | null): string {
  const c = color || FALLBACK_CATEGORY_COLOR;
  return `linear-gradient(to right, ${c}, color-mix(in oklch, ${c} 70%, transparent))`;
}

const formatBRL = (value: number) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  }).format(value);

const BAR_FROM = "oklch(0.78 0.09 200)";
const BAR_TO = "oklch(0.72 0.05 265)";
const BAR_SELECTED = "oklch(0.62 0.14 255)";

export type CategoryDatum = {
  key: string;
  label: string;
  total: number;
  icon?: string | null;
  color?: string | null;
};

export type SubcategoryDatum = { label: string; total: number };

type TickProps = {
  x?: number;
  y?: number;
  payload?: { value: string };
  iconMap?: Map<string, { icon?: string | null; color?: string | null }>;
  axisWidth?: number;
  selected?: string | null;
};

function CategoryTick({ x = 0, y = 0, payload, iconMap, axisWidth = 150, selected }: TickProps) {
  const label = payload?.value ?? "";
  const meta = iconMap?.get(label);
  const hasIcon = Boolean(meta?.icon);
  const isSelected = label === selected;
  const foWidth = axisWidth - 8;
  return (
    <g transform={`translate(${x},${y})`}>
      {hasIcon ? (
        <foreignObject x={-axisWidth} y={-10} width={foWidth} height={20}>
          <div
            className={`flex items-center justify-end gap-1.5 pr-1 text-[11px] leading-5 ${
              isSelected ? "text-primary font-medium" : "text-foreground"
            }`}
          >
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
          fontWeight={isSelected ? 600 : 400}
          className={isSelected ? "fill-primary" : "fill-foreground"}
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
  subcategoryBreakdown,
}: {
  data: CategoryDatum[];
  visibleCount?: number;
  subcategoryBreakdown?: Map<string, SubcategoryDatum[]>;
}) {
  const [expanded, setExpanded] = useState(false);
  const [narrow, setNarrow] = useState(false);
  const [dialogCategory, setDialogCategory] = useState<string | null>(null);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 480);
    check();
    window.addEventListener("resize", check, { passive: true });
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    setDialogCategory(null);
    setExpanded(false);
  }, [data]);

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

  const handleBarClick = (entry: {
    label?: string;
    name?: string;
    payload?: { label?: string };
  }) => {
    if (!subcategoryBreakdown) return;
    const label = entry.label ?? entry.payload?.label ?? entry.name ?? "";
    if (!label) return;
    setDialogCategory(label);
  };

  const dialogSubs = dialogCategory ? (subcategoryBreakdown?.get(dialogCategory) ?? []) : [];
  const dialogMeta = dialogCategory ? sorted.find((d) => d.label === dialogCategory) : null;
  const subMax = dialogSubs.length > 0 ? dialogSubs[0].total : 1;
  const subTotal = dialogSubs.reduce((acc, s) => acc + s.total, 0);

  const sortedLabels = sorted.map((d) => d.label);
  const currentIdx = dialogCategory ? sortedLabels.indexOf(dialogCategory) : -1;
  const prevLabel = currentIdx > 0 ? sortedLabels[currentIdx - 1] : null;
  const nextLabel =
    currentIdx >= 0 && currentIdx < sortedLabels.length - 1 ? sortedLabels[currentIdx + 1] : null;

  return (
    <>
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
              <linearGradient id="cat-bar-selected" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={BAR_SELECTED} stopOpacity={1} />
                <stop offset="100%" stopColor="oklch(0.58 0.10 280)" stopOpacity={1} />
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
              tick={
                <CategoryTick iconMap={iconMap} axisWidth={axisWidth} selected={dialogCategory} />
              }
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
              stroke={BAR_FROM}
              strokeOpacity={0.3}
              strokeWidth={0.5}
              style={{ cursor: subcategoryBreakdown ? "pointer" : "default" }}
              onClick={subcategoryBreakdown ? handleBarClick : undefined}
              label={{
                position: "right",
                fontSize: 10.5,
                fill: "currentColor",
                className: "fill-foreground/85 font-mono tabular-nums",
                formatter: (label) => (label === undefined ? "" : formatBRL(Number(label))),
              }}
            >
              {visible.map((entry) => (
                <Cell
                  key={entry.key}
                  fill={entry.label === dialogCategory ? "url(#cat-bar-selected)" : "url(#cat-bar)"}
                  fillOpacity={dialogCategory !== null && entry.label !== dialogCategory ? 0.38 : 1}
                />
              ))}
            </Bar>
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

      {/* Subcategory dialog — matches monthly goal dialog layout */}
      <Dialog
        open={dialogCategory !== null}
        onOpenChange={(open) => !open && setDialogCategory(null)}
      >
        <DialogContent className="flex max-h-[90dvh] w-full max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="border-border shrink-0 border-b px-5 py-4">
            <DialogTitle className="flex items-center gap-2.5 text-[15px] font-semibold tracking-tight">
              {dialogMeta && (
                <CategoryIcon
                  icon={dialogMeta.icon}
                  color={dialogMeta.color ?? undefined}
                  size={16}
                />
              )}
              <span className="min-w-0 truncate">{dialogCategory}</span>
              <span className="text-muted-foreground ml-auto font-mono text-[12px] font-normal tabular-nums">
                {dialogMeta ? formatBRL(dialogMeta.total) : ""}
              </span>
            </DialogTitle>
            <p className="text-muted-foreground text-[12px]">
              breakdown by subcategory — cash + credit + recurring.
            </p>
          </DialogHeader>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {dialogSubs.length === 0 ? (
              <p className="text-muted-foreground py-6 text-center text-[12px]">
                no subcategories recorded.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {dialogSubs.map((sub) => {
                  const pct = subTotal > 0 ? (sub.total / subTotal) * 100 : 0;
                  return (
                    <div key={sub.label} className="flex items-center gap-3 py-1.5">
                      <span className="text-foreground/80 w-32 shrink-0 truncate text-[12.5px]">
                        {sub.label}
                      </span>
                      <div className="bg-muted/50 relative h-[6px] flex-1 overflow-hidden rounded-full">
                        <div
                          className="h-full rounded-full transition-all duration-500 ease-[cubic-bezier(0.2,0.7,0.2,1)]"
                          style={{
                            width: `${(sub.total / subMax) * 100}%`,
                            background: subBarBackground(dialogMeta?.color),
                          }}
                        />
                      </div>
                      <span className="text-muted-foreground/70 w-10 shrink-0 text-right font-mono text-[10px] tabular-nums">
                        {pct.toFixed(0)}%
                      </span>
                      <span className="text-foreground/80 w-20 shrink-0 text-right font-mono text-[11.5px] tabular-nums">
                        {formatBRL(sub.total)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="border-border flex shrink-0 items-center justify-between gap-3 border-t px-5 py-3">
            <button
              type="button"
              disabled={!prevLabel}
              onClick={() => prevLabel && setDialogCategory(prevLabel)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <ChevronLeft className="size-3.5" strokeWidth={1.7} />
              <span className="max-w-[100px] truncate">{prevLabel ?? "—"}</span>
            </button>

            <span className="text-muted-foreground/60 font-mono text-[10px] tracking-[0.16em]">
              {currentIdx + 1} / {sortedLabels.length}
            </span>

            <button
              type="button"
              disabled={!nextLabel}
              onClick={() => nextLabel && setDialogCategory(nextLabel)}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[11.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <span className="max-w-[100px] truncate">{nextLabel ?? "—"}</span>
              <ChevronRight className="size-3.5" strokeWidth={1.7} />
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

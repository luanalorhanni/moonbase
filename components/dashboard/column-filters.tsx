"use client";

import { Filter, Search, X } from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn, formatCurrency } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────────────── */
/*  Types                                                                  */
/* ────────────────────────────────────────────────────────────────────── */

export type DateRange = { from: string; to: string };
export type AmountRange = { min: string; max: string };

export const EMPTY_DATE_RANGE: DateRange = { from: "", to: "" };
export const EMPTY_AMOUNT_RANGE: AmountRange = { min: "", max: "" };

export function isDateRangeActive(r: DateRange): boolean {
  return r.from !== "" || r.to !== "";
}

export function isAmountRangeActive(r: AmountRange): boolean {
  return r.min !== "" || r.max !== "";
}

export function dateInRange(date: string, range: DateRange): boolean {
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

export function monthInRange(month: string, range: DateRange): boolean {
  // month is "YYYY-MM-01"; compare on yyyy-mm prefix only
  const m = month.slice(0, 7);
  if (range.from && m < range.from.slice(0, 7)) return false;
  if (range.to && m > range.to.slice(0, 7)) return false;
  return true;
}

export function periodOverlapsRange(
  firstMonth: string | null,
  lastMonth: string | null,
  range: DateRange,
): boolean {
  if (!firstMonth || !lastMonth) return !isDateRangeActive(range);
  const start = firstMonth.slice(0, 7);
  const end = lastMonth.slice(0, 7);
  // Overlap: !(end < range.from || start > range.to)
  if (range.from && end < range.from.slice(0, 7)) return false;
  if (range.to && start > range.to.slice(0, 7)) return false;
  return true;
}

export function amountInRange(amount: string | number, range: AmountRange): boolean {
  const n = typeof amount === "string" ? Number(amount) : amount;
  if (range.min && n < Number(range.min)) return false;
  if (range.max && n > Number(range.max)) return false;
  return true;
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Status bar above table                                                 */
/* ────────────────────────────────────────────────────────────────────── */

export function StatusBar({
  shownCount,
  totalCount,
  filteredTotal,
  isFiltering,
  clearFilters,
  totalLabel = "total",
}: {
  shownCount: number;
  totalCount: number;
  filteredTotal: number;
  isFiltering: boolean;
  clearFilters: () => void;
  totalLabel?: string;
}) {
  return (
    <div className="border-border bg-muted/20 sticky top-0 z-10 flex shrink-0 items-center justify-between gap-3 border-b px-5 py-2 backdrop-blur">
      <div className="text-muted-foreground/70 flex items-baseline gap-3 font-mono text-[11.5px] tracking-wider">
        <span>
          <span className="text-foreground tabular-nums">{shownCount}</span>
          {shownCount !== totalCount && (
            <span className="text-muted-foreground/50"> / {totalCount}</span>
          )}{" "}
          shown
        </span>
        <span className="bg-border-strong h-3 w-px" />
        <span>
          {totalLabel}{" "}
          <span className="numeric text-foreground tabular-nums">
            {formatCurrency(String(filteredTotal))}
          </span>
        </span>
      </div>
      {isFiltering && (
        <button
          type="button"
          onClick={clearFilters}
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[12px] transition-colors"
        >
          <X className="size-3" strokeWidth={1.8} />
          clear filters
        </button>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Search header (text query)                                             */
/* ────────────────────────────────────────────────────────────────────── */

export function ColumnSearch({
  label,
  query,
  setQuery,
  placeholder = "search...",
}: {
  label: string;
  query: string;
  setQuery: (v: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const active = query.trim() !== "";
  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger
        className={cn(
          "group/header inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors",
          active ? "text-primary" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <span>{label}</span>
        <Search
          className={cn(
            "size-3 transition-opacity",
            active ? "opacity-100" : "opacity-30 group-hover/header:opacity-80",
          )}
          strokeWidth={1.7}
        />
        {active && <span className="bg-primary block size-1.5 rounded-full" />}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[260px] p-2">
        <div className="border-input bg-background flex h-8 items-center gap-2 rounded-md border px-2.5">
          <Search className="text-muted-foreground/70 size-3.5" strokeWidth={1.7} />
          <input
            type="text"
            autoFocus
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setOpen(false);
            }}
            className="placeholder:text-muted-foreground/60 h-full flex-1 bg-transparent text-[13px] outline-none"
          />
          {query !== "" && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="text-muted-foreground/60 hover:text-foreground transition-colors"
              aria-label="clear search"
            >
              <X className="size-3" strokeWidth={1.8} />
            </button>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Single-select dropdown filter                                          */
/* ────────────────────────────────────────────────────────────────────── */

export function ColumnFilter({
  label,
  active,
  activeChip,
  onClear,
  children,
}: {
  label: string;
  active: boolean;
  activeChip: { label: string; color?: string } | null;
  onClear: () => void;
  children: ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group/header inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>{label}</span>
          <Filter
            className={cn(
              "size-3 transition-opacity",
              active ? "opacity-100" : "opacity-30 group-hover/header:opacity-80",
            )}
            strokeWidth={1.7}
          />
          {active && <span className="bg-primary block size-1.5 rounded-full" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="max-h-[300px] w-[220px] overflow-auto">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
      {activeChip && (
        <span
          className="border-primary/30 bg-primary/[0.07] text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] normal-case"
          style={{
            borderColor: activeChip.color
              ? `color-mix(in oklab, ${activeChip.color} 40%, var(--border))`
              : undefined,
          }}
        >
          {activeChip.color && (
            <span
              aria-hidden
              className="block size-1.5 rounded-full"
              style={{ backgroundColor: activeChip.color }}
            />
          )}
          <span className="max-w-[100px] truncate">{activeChip.label}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
            className="text-muted-foreground/60 hover:text-foreground -mr-0.5 transition-colors"
            aria-label={`clear ${label}`}
          >
            <X className="size-2.5" strokeWidth={2} />
          </button>
        </span>
      )}
    </span>
  );
}

export function FilterOption({
  label,
  color,
  active,
  onClick,
}: {
  label: string;
  color?: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <DropdownMenuItem
      onClick={onClick}
      className={cn("gap-2 text-[13px]", active && "bg-primary/[0.08] text-foreground")}
    >
      {color && (
        <span
          aria-hidden
          className="block size-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
      )}
      <span className="truncate">{label}</span>
      {active && <span className="text-primary ml-auto">✓</span>}
    </DropdownMenuItem>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Date range filter                                                      */
/* ────────────────────────────────────────────────────────────────────── */

const RANGE_INPUT =
  "border-input bg-background h-8 flex-1 rounded-md border px-2 text-[12.5px] outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/40 focus-visible:ring-3";

export function ColumnDateRange({
  label,
  value,
  onChange,
  granularity = "day",
}: {
  label: string;
  value: DateRange;
  onChange: (v: DateRange) => void;
  /** "day" uses type=date inputs (YYYY-MM-DD). "month" uses type=month (YYYY-MM). */
  granularity?: "day" | "month";
}) {
  const active = isDateRangeActive(value);
  const inputType = granularity === "month" ? "month" : "date";
  const chipLabel = active ? rangeLabel(value, granularity) : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group/header inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>{label}</span>
          <Filter
            className={cn(
              "size-3 transition-opacity",
              active ? "opacity-100" : "opacity-30 group-hover/header:opacity-80",
            )}
            strokeWidth={1.7}
          />
          {active && <span className="bg-primary block size-1.5 rounded-full" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] p-2">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground/70 flex items-center justify-between font-mono text-[11px] tracking-wider">
              <span>from / to</span>
              {active && (
                <button
                  type="button"
                  onClick={() => onChange(EMPTY_DATE_RANGE)}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 normal-case transition-colors"
                >
                  <X className="size-2.5" strokeWidth={2} />
                  reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type={inputType}
                value={value.from}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
                className={RANGE_INPUT}
              />
              <span className="text-muted-foreground/60 text-[12px]">→</span>
              <input
                type={inputType}
                value={value.to}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
                className={RANGE_INPUT}
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {chipLabel && (
        <span className="border-primary/30 bg-primary/[0.07] text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] normal-case">
          <span className="font-mono tabular-nums">{chipLabel}</span>
          <button
            type="button"
            onClick={() => onChange(EMPTY_DATE_RANGE)}
            className="text-muted-foreground/60 hover:text-foreground -mr-0.5 transition-colors"
            aria-label={`clear ${label}`}
          >
            <X className="size-2.5" strokeWidth={2} />
          </button>
        </span>
      )}
    </span>
  );
}

/* ────────────────────────────────────────────────────────────────────── */
/*  Amount range filter                                                    */
/* ────────────────────────────────────────────────────────────────────── */

export function ColumnAmountRange({
  label,
  value,
  onChange,
}: {
  label: string;
  value: AmountRange;
  onChange: (v: AmountRange) => void;
}) {
  const active = isAmountRangeActive(value);
  const chipLabel = active
    ? `${value.min ? `≥ ${value.min}` : ""}${value.min && value.max ? " · " : ""}${value.max ? `≤ ${value.max}` : ""}`
    : null;

  return (
    <span className="inline-flex items-center gap-1.5">
      <DropdownMenu>
        <DropdownMenuTrigger
          className={cn(
            "group/header inline-flex items-center gap-1.5 rounded px-1 py-0.5 transition-colors",
            active ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          <span>{label}</span>
          <Filter
            className={cn(
              "size-3 transition-opacity",
              active ? "opacity-100" : "opacity-30 group-hover/header:opacity-80",
            )}
            strokeWidth={1.7}
          />
          {active && <span className="bg-primary block size-1.5 rounded-full" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px] p-2">
          <div className="flex flex-col gap-2">
            <div className="text-muted-foreground/70 flex items-center justify-between font-mono text-[11px] tracking-wider">
              <span>min / max (R$)</span>
              {active && (
                <button
                  type="button"
                  onClick={() => onChange(EMPTY_AMOUNT_RANGE)}
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 normal-case transition-colors"
                >
                  <X className="size-2.5" strokeWidth={2} />
                  reset
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                inputMode="decimal"
                placeholder="min"
                value={value.min}
                onChange={(e) => onChange({ ...value, min: e.target.value })}
                className={RANGE_INPUT}
              />
              <span className="text-muted-foreground/60 text-[12px]">→</span>
              <input
                type="number"
                inputMode="decimal"
                placeholder="max"
                value={value.max}
                onChange={(e) => onChange({ ...value, max: e.target.value })}
                className={RANGE_INPUT}
              />
            </div>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
      {chipLabel && (
        <span className="border-primary/30 bg-primary/[0.07] text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11.5px] normal-case">
          <span className="font-mono tabular-nums">{chipLabel}</span>
          <button
            type="button"
            onClick={() => onChange(EMPTY_AMOUNT_RANGE)}
            className="text-muted-foreground/60 hover:text-foreground -mr-0.5 transition-colors"
            aria-label={`clear ${label}`}
          >
            <X className="size-2.5" strokeWidth={2} />
          </button>
        </span>
      )}
    </span>
  );
}

function rangeLabel(r: DateRange, granularity: "day" | "month"): string {
  const trim = (s: string) => (granularity === "month" ? s : s.slice(5));
  if (r.from && r.to) return `${trim(r.from)} → ${trim(r.to)}`;
  if (r.from) return `≥ ${trim(r.from)}`;
  if (r.to) return `≤ ${trim(r.to)}`;
  return "";
}

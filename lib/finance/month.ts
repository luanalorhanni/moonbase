/**
 * Month-level aggregation helpers. Pure logic — no database access, no
 * timezone math. Inputs are plain strings (`YYYY-MM-DD` for dates, `YYYY-MM`
 * for month references) and numeric strings for amounts. Aggregations are
 * also returned as numeric strings to preserve the `numeric(12,2)`
 * representation end-to-end (per arch §6.3).
 *
 * Tests live in __tests__/month.test.ts.
 */

export type MonthRef = string;

const EN_MONTH_SHORT = [
  "jan",
  "feb",
  "mar",
  "apr",
  "may",
  "jun",
  "jul",
  "aug",
  "sep",
  "oct",
  "nov",
  "dec",
] as const;

const EN_MONTH_LONG = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
] as const;

export function isMonthRef(value: string): value is MonthRef {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(value);
}

export function toMonthRef(yyyyMmDd: string | null): MonthRef | null {
  if (!yyyyMmDd) return null;
  return yyyyMmDd.slice(0, 7);
}

export function currentMonthRef(now?: Date): MonthRef {
  if (!now) {
    return new Intl.DateTimeFormat("sv-SE", { timeZone: "America/Sao_Paulo" })
      .format(new Date())
      .slice(0, 7) as MonthRef;
  }
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function shiftMonth(month: MonthRef, delta: number): MonthRef {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + delta;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${String(nm).padStart(2, "0")}`;
}

export function formatMonthShort(month: MonthRef): string {
  const [y, m] = month.split("-").map(Number);
  return `${EN_MONTH_SHORT[m - 1]}/${String(y).slice(2)}`;
}

export function formatMonthLong(month: MonthRef): string {
  const [y, m] = month.split("-").map(Number);
  return `${EN_MONTH_LONG[m - 1]} ${y}`;
}

export function isInMonth(dateYmd: string, month: MonthRef): boolean {
  return dateYmd.slice(0, 7) === month;
}

export function parcelSpansMonth(
  firstParcelMonth: string | null,
  lastParcelMonth: string | null,
  month: MonthRef,
): boolean {
  if (!firstParcelMonth || !lastParcelMonth) return false;
  return firstParcelMonth.slice(0, 7) <= month && month <= lastParcelMonth.slice(0, 7);
}

export function fixedExpenseActiveInMonth(
  startDate: string,
  endDate: string | null,
  isActive: boolean,
  month: MonthRef,
): boolean {
  if (!isActive) return false;
  if (startDate.slice(0, 7) > month) return false;
  if (endDate && endDate.slice(0, 7) < month) return false;
  return true;
}

export function sumNumeric(values: ReadonlyArray<string>): string {
  const total = values.reduce((acc, v) => acc + Number(v), 0);
  return total.toFixed(2);
}

export function subtractNumeric(a: string, b: string): string {
  return (Number(a) - Number(b)).toFixed(2);
}

/** Flip the sign of a numeric string, keeping the numeric(12,2) shape. */
export function negateNumeric(a: string): string {
  return (-Number(a)).toFixed(2);
}

export type GroupBucket = {
  key: string;
  label: string;
  total: string;
  color?: string;
  icon?: string | null;
};

export function groupSum<T>(
  items: ReadonlyArray<T>,
  keyFn: (item: T) => string,
  amountFn: (item: T) => string,
  metaFn: (item: T) => { label: string; color?: string; icon?: string | null },
): GroupBucket[] {
  const buckets = new Map<
    string,
    { label: string; total: number; color?: string; icon?: string | null }
  >();
  for (const item of items) {
    const key = keyFn(item);
    const meta = metaFn(item);
    const existing = buckets.get(key);
    if (existing) {
      existing.total += Number(amountFn(item));
    } else {
      buckets.set(key, {
        label: meta.label,
        color: meta.color,
        icon: meta.icon,
        total: Number(amountFn(item)),
      });
    }
  }
  return Array.from(buckets.entries())
    .map(([key, { label, total, color, icon }]) => ({
      key,
      label,
      total: total.toFixed(2),
      color,
      icon,
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));
}

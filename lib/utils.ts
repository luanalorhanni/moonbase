import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CURRENCY = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "BRL",
});

export function formatCurrency(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return CURRENCY.format(n);
}

export const formatBRL = formatCurrency;

const COMPACT = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "BRL",
  notation: "compact",
  maximumFractionDigits: 1,
});

export function formatCurrencyCompact(value: string | number): string {
  const n = typeof value === "string" ? Number(value) : value;
  if (Number.isNaN(n)) return "—";
  return COMPACT.format(n);
}

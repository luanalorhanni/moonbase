import "server-only";

import { cache } from "react";

import { aggregateYear, type MonthAggregate } from "@/lib/finance/aggregate";
import { sumNumeric } from "@/lib/finance/month";

import { loadFullDataset, toAggregateInputs } from "./month";
import { listSnapshots } from "./snapshots";

export type YearSummary = {
  year: number;
  months: MonthAggregate[];
  totalIncomes: string;
  totalExpenses: string;
  balance: string;
};

/**
 * Aggregate the year from raw data, but let snapshots win whenever they
 * exist for a given month. Snapshots are the user's frozen ground truth
 * (typically seeded from the spreadsheet for pre-tracking history) and
 * already roll up every contemporaneous parcel and recurring expense.
 *
 * Mixing raw + snapshot risked double-counting and produced phantom
 * months where a single long-running installment from a recent purchase
 * suppressed the snapshot. The detailed view of any month is still one
 * click away in /month/[reference].
 */
export const loadYear = cache(_loadYear);

async function _loadYear(year: number): Promise<YearSummary> {
  const [dataset, snapshots] = await Promise.all([loadFullDataset(), listSnapshots()]);
  const months = aggregateYear(toAggregateInputs(dataset), year);

  const snapByMonth = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    snapByMonth.set(s.referenceMonth.toString().slice(0, 7), s);
  }

  const overlaid = months.map((m) => {
    const snap = snapByMonth.get(m.reference);
    if (!snap) return m;
    const incomes = snap.totalIncomes;
    const expenses = snap.totalExpenses;
    const balance = (Number(incomes) - Number(expenses)).toFixed(2);
    return {
      ...m,
      totalIncomes: incomes,
      totalCashExpenses: "0.00",
      totalCreditExpenses: "0.00",
      totalFixedExpenses: expenses,
      totalExpenses: expenses,
      balance,
      byCategory: [],
      byCard: [],
    } satisfies MonthAggregate;
  });

  const totalIncomes = sumNumeric(overlaid.map((m) => m.totalIncomes));
  const totalExpenses = sumNumeric(overlaid.map((m) => m.totalExpenses));
  const balance = (Number(totalIncomes) - Number(totalExpenses)).toFixed(2);

  return { year, months: overlaid, totalIncomes, totalExpenses, balance };
}

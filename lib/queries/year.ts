import "server-only";

import { cache } from "react";

import { aggregateYear, type MonthAggregate } from "@/lib/finance/aggregate";
import { currentMonthRef, sumNumeric } from "@/lib/finance/month";

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
 * Aggregate the year. A snapshot is a *closed* month's frozen ground truth
 * (ADR-005): once a month is in the past it never changes retroactively, so
 * its snapshot wins over the live aggregate. This matters because historical
 * months often carry only stray data — a single long-running installment
 * (e.g. a R$133 parcel from an earlier purchase) or a one-off boundary income
 * — which on its own would render the month as ~R$133 of expenses with zero
 * income, suppressing the real snapshot totals.
 *
 * The current and future months always read live: they're still moving, and
 * any snapshot they may carry is a provisional projection, not a close. ("Mês
 * fechado, snapshot fechado.") The detailed per-transaction view of any month
 * is one click away in /month/[reference].
 */
export const loadYear = cache(_loadYear);

async function _loadYear(year: number): Promise<YearSummary> {
  const [dataset, snapshots] = await Promise.all([loadFullDataset(), listSnapshots()]);
  const months = aggregateYear(toAggregateInputs(dataset), year);

  const snapByMonth = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    snapByMonth.set(s.referenceMonth.toString().slice(0, 7), s);
  }

  const current = currentMonthRef();

  const overlaid = months.map((m) => {
    const snap = snapByMonth.get(m.reference);
    // Live wins for the current and future months; closed months defer to
    // their frozen snapshot when one exists.
    if (!snap || m.reference >= current) return m;

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

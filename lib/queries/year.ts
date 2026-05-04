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
 * Aggregate the year using the same rule as the monthly view: the live
 * payment-month aggregate wins whenever there's any raw evidence the
 * user logged that month (incomes, cash, or credit). Snapshots only
 * fill months that have no raw signal at all — typically pre-tracking
 * history seeded from the spreadsheet. Recurring fixed expenses are
 * ignored for this check because a subscription started years ago
 * projects forward into every month it stayed active and would
 * otherwise suppress the snapshot.
 */
export const loadYear = cache(_loadYear);

async function _loadYear(year: number): Promise<YearSummary> {
  const [dataset, snapshots] = await Promise.all([loadFullDataset(), listSnapshots()]);
  const months = aggregateYear(toAggregateInputs(dataset), year);

  const snapByMonth = new Map<string, (typeof snapshots)[number]>();
  for (const s of snapshots) {
    snapByMonth.set(s.referenceMonth.toString().slice(0, 7), s);
  }

  function hasRawAggregate(m: MonthAggregate): boolean {
    return (
      Number(m.totalIncomes) > 0 ||
      Number(m.totalCashExpenses) > 0 ||
      Number(m.totalCreditExpenses) > 0
    );
  }

  const overlaid = months.map((m) => {
    if (hasRawAggregate(m)) return m;
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

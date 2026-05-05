import "server-only";

import { cache } from "react";

import { aggregateYear, type MonthAggregate } from "@/lib/finance/aggregate";
import { isInMonth, parcelSpansMonth, sumNumeric } from "@/lib/finance/month";

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
 * Aggregate the year. For every month that has a snapshot, the snapshot
 * wins — it's the user's frozen ground truth and already rolls up every
 * contemporaneous parcel and recurring expense. Months without a
 * snapshot fall back to the live payment-month aggregate.
 *
 * (We tried "raw wins when non-empty" earlier so this could mirror the
 * monthly view; the result was that a single long-running installment
 * — e.g. a R$133 parcel from a March purchase — would silently suppress
 * the snapshot for every month that parcel landed on, leaving most of
 * the year reading as ~R$133 of "raw" expenses. The detailed view of
 * any month is one click away in /month/[reference].)
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

    // Mirror loadMonth: snapshot only wins when the month has no raw
    // transactions (cash / credit / incomes). If the user has recorded
    // anything in detail, the live aggregate is the source of truth —
    // otherwise past months with long-running installments or snapshots
    // would show stale numbers that disagree with the month view.
    const hasRawData =
      dataset.cashExpenses.some((e) => isInMonth(e.date, m.reference)) ||
      dataset.creditExpenses.some((e) =>
        parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, m.reference),
      ) ||
      dataset.incomes.some((i) => isInMonth(i.date, m.reference));

    if (hasRawData) return m;

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

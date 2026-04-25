/**
 * Pure snapshot construction. Takes a MonthAggregate, the active investment
 * balances, and the cumulative total_save up to the previous month, and
 * returns a monthly_snapshots row.
 *
 * total_save is the running cumulative balance — sum of all monthly
 * balances up to and including this month. It does NOT include investment
 * balances; those are stored separately as totalLiquidSavings/totalFixedIncome.
 *
 * Tests live in __tests__/snapshots.test.ts.
 */

import type { MonthAggregate } from "./aggregate";
import { formatMonthLong, type MonthRef } from "./month";

export type SnapshotInputs = {
  aggregate: MonthAggregate;
  /** Sum of latest_yield for active liquid_savings rows. */
  liquidSavingsTotal: string;
  /** Sum of latest_yield for active fixed_income rows. */
  fixedIncomeTotal: string;
  /**
   * Cumulative balance up to (but not including) the snapshot month. Pass
   * "0.00" when generating the first snapshot.
   */
  previousTotalSave: string;
};

export type SnapshotPayload = {
  monthLabel: string;
  referenceMonth: string;
  totalIncomes: string;
  totalExpenses: string;
  totalSave: string;
  totalLiquidSavings: string;
  totalFixedIncome: string;
};

export function buildMonthlySnapshot(inputs: SnapshotInputs): SnapshotPayload {
  const { aggregate, liquidSavingsTotal, fixedIncomeTotal, previousTotalSave } = inputs;
  const totalSave = (Number(previousTotalSave) + Number(aggregate.balance)).toFixed(2);

  return {
    monthLabel: formatMonthLong(aggregate.reference),
    referenceMonth: `${aggregate.reference}-01`,
    totalIncomes: aggregate.totalIncomes,
    totalExpenses: aggregate.totalExpenses,
    totalSave,
    totalLiquidSavings: liquidSavingsTotal,
    totalFixedIncome: fixedIncomeTotal,
  };
}

/** Returns the month immediately preceding `now`, e.g. on 2026-04-12 → "2026-03". */
export function previousMonthRef(now: Date = new Date()): MonthRef {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-based; previous month is m-1, but for January wrap
  const prevYear = m === 0 ? y - 1 : y;
  const prevMonth = m === 0 ? 12 : m;
  return `${prevYear}-${String(prevMonth).padStart(2, "0")}`;
}

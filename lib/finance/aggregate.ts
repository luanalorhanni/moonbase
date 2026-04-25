/**
 * Pure aggregation pipeline: turns raw row arrays into a per-month summary.
 * Used by both /month and /year — the year view calls aggregateMonth once
 * per month over a single fetch of the full dataset.
 *
 * No I/O, no Date math. Tests live in __tests__/aggregate.test.ts.
 */

import {
  fixedExpenseActiveInMonth,
  groupSum,
  isInMonth,
  parcelSpansMonth,
  subtractNumeric,
  sumNumeric,
  type GroupBucket,
  type MonthRef,
} from "./month";

export type AggregateInputs = {
  cashExpenses: ReadonlyArray<{
    id: string;
    date: string;
    amount: string;
    cardId: string;
    cardName: string;
    cardColor?: string;
    subcategoryId: string;
    categoryName: string;
  }>;
  creditExpenses: ReadonlyArray<{
    id: string;
    firstParcelMonth: string | null;
    lastParcelMonth: string | null;
    parcelValue: string;
    cardId: string;
    cardName: string;
    cardColor?: string;
    subcategoryId: string;
    categoryName: string;
  }>;
  fixedExpenses: ReadonlyArray<{
    id: string;
    startDate: string;
    endDate: string | null;
    isActive: boolean;
    monthlyAmount: string;
    cardId: string;
    cardName: string;
    cardColor?: string;
    subcategoryId: string;
    categoryName: string;
  }>;
  incomes: ReadonlyArray<{
    id: string;
    date: string;
    amount: string;
  }>;
  cashReceivables: ReadonlyArray<{
    id: string;
    expectedPaymentMonth: string;
    amount: string;
  }>;
  creditReceivables: ReadonlyArray<{
    id: string;
    firstParcelMonth: string | null;
    lastParcelMonth: string | null;
    parcelValue: string;
  }>;
};

export type MonthAggregate = {
  reference: MonthRef;
  totalIncomes: string;
  totalCashExpenses: string;
  totalCreditExpenses: string;
  totalFixedExpenses: string;
  totalExpenses: string;
  balance: string;
  totalCashReceivables: string;
  totalCreditReceivables: string;
  totalReceivables: string;
  byCategory: GroupBucket[];
  byCard: GroupBucket[];
};

export function aggregateMonth(rows: AggregateInputs, reference: MonthRef): MonthAggregate {
  const cash = rows.cashExpenses.filter((e) => isInMonth(e.date, reference));
  const credit = rows.creditExpenses.filter((e) =>
    parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, reference),
  );
  const fixed = rows.fixedExpenses.filter((e) =>
    fixedExpenseActiveInMonth(e.startDate, e.endDate, e.isActive, reference),
  );
  const incomes = rows.incomes.filter((i) => isInMonth(i.date, reference));
  const cashRec = rows.cashReceivables.filter((r) => isInMonth(r.expectedPaymentMonth, reference));
  const creditRec = rows.creditReceivables.filter((r) =>
    parcelSpansMonth(r.firstParcelMonth, r.lastParcelMonth, reference),
  );

  const totalIncomes = sumNumeric(incomes.map((i) => i.amount));
  const totalCashExpenses = sumNumeric(cash.map((e) => e.amount));
  const totalCreditExpenses = sumNumeric(credit.map((e) => e.parcelValue));
  const totalFixedExpenses = sumNumeric(fixed.map((e) => e.monthlyAmount));
  const totalExpenses = sumNumeric([totalCashExpenses, totalCreditExpenses, totalFixedExpenses]);
  const balance = subtractNumeric(totalIncomes, totalExpenses);
  const totalCashReceivables = sumNumeric(cashRec.map((r) => r.amount));
  const totalCreditReceivables = sumNumeric(creditRec.map((r) => r.parcelValue));
  const totalReceivables = sumNumeric([totalCashReceivables, totalCreditReceivables]);

  const byCategory = groupSum(
    [
      ...cash.map((e) => ({ key: e.categoryName, amount: e.amount, label: e.categoryName })),
      ...credit.map((e) => ({
        key: e.categoryName,
        amount: e.parcelValue,
        label: e.categoryName,
      })),
      ...fixed.map((e) => ({
        key: e.categoryName,
        amount: e.monthlyAmount,
        label: e.categoryName,
      })),
    ],
    (r) => r.key,
    (r) => r.amount,
    (r) => ({ label: r.label }),
  );

  type CardBucket = { key: string; amount: string; label: string; color?: string };
  const cardBuckets: CardBucket[] = [
    ...cash.map((e) => ({
      key: e.cardId,
      amount: e.amount,
      label: e.cardName,
      color: e.cardColor,
    })),
    ...credit.map((e) => ({
      key: e.cardId,
      amount: e.parcelValue,
      label: e.cardName,
      color: e.cardColor,
    })),
    ...fixed.map((e) => ({
      key: e.cardId,
      amount: e.monthlyAmount,
      label: e.cardName,
      color: e.cardColor,
    })),
  ];

  const byCard = groupSum(
    cardBuckets,
    (r) => r.key,
    (r) => r.amount,
    (r) => ({ label: r.label, color: r.color }),
  );

  return {
    reference,
    totalIncomes,
    totalCashExpenses,
    totalCreditExpenses,
    totalFixedExpenses,
    totalExpenses,
    balance,
    totalCashReceivables,
    totalCreditReceivables,
    totalReceivables,
    byCategory,
    byCard,
  };
}

export function aggregateYear(rows: AggregateInputs, year: number): MonthAggregate[] {
  const months: MonthRef[] = Array.from(
    { length: 12 },
    (_, i) => `${year}-${String(i + 1).padStart(2, "0")}`,
  );
  return months.map((m) => aggregateMonth(rows, m));
}

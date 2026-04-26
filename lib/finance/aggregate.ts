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
  shiftMonth,
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
    method?: string;
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
    description?: string;
    totalParcels?: number;
    purchaseDate?: string;
    subcategoryName?: string;
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
    type?: string;
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

export type CardForInvoice = {
  id: string;
  name: string;
  color?: string;
  defaultClosingDay: number | null;
  dueDay: number | null;
};

export type InvoiceItem = {
  id: string;
  description: string;
  parcelValue: string;
  totalParcels: number;
  /** 1-based parcel index that lands on `reference` (e.g. 3 of 12). */
  parcelIndex: number;
  purchaseDate: string;
  subcategoryName: string;
  categoryName: string;
};

export type InvoicePerCard = {
  cardId: string;
  cardName: string;
  cardColor?: string;
  closingDay: number | null;
  dueDay: number | null;
  count: number;
  total: string;
  items: InvoiceItem[];
};

/**
 * Per-card breakdown of credit purchases that land on the invoice closing in
 * `reference` month. Used by the home and month pages to surface "fatura em
 * formação" — the open invoice that current spending is feeding into.
 *
 * Cards with no purchases for the month are omitted. Buckets are sorted by
 * total descending so the heaviest invoice surfaces first.
 */
export function invoicePerCard(
  creditExpenses: AggregateInputs["creditExpenses"],
  cards: ReadonlyArray<CardForInvoice>,
  reference: MonthRef,
): InvoicePerCard[] {
  const inMonth = creditExpenses.filter((e) =>
    parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, reference),
  );

  const byCardId = new Map<string, { count: number; total: number; items: InvoiceItem[] }>();
  for (const e of inMonth) {
    const bucket = byCardId.get(e.cardId) ?? { count: 0, total: 0, items: [] as InvoiceItem[] };
    bucket.count += 1;
    bucket.total += Number(e.parcelValue);
    bucket.items.push({
      id: e.id,
      description: e.description ?? "",
      parcelValue: e.parcelValue,
      totalParcels: e.totalParcels ?? 1,
      parcelIndex: parcelIndexAt(e.firstParcelMonth, reference),
      purchaseDate: e.purchaseDate ?? "",
      subcategoryName: e.subcategoryName ?? "",
      categoryName: e.categoryName,
    });
    byCardId.set(e.cardId, bucket);
  }

  return cards
    .filter((c) => byCardId.has(c.id))
    .map((c) => {
      const b = byCardId.get(c.id)!;
      // Within a card, sort items by amount desc — heaviest charges first.
      const items = b.items
        .slice()
        .sort((x, y) => Number(y.parcelValue) - Number(x.parcelValue));
      return {
        cardId: c.id,
        cardName: c.name,
        cardColor: c.color,
        closingDay: c.defaultClosingDay,
        dueDay: c.dueDay,
        count: b.count,
        total: b.total.toFixed(2),
        items,
      };
    })
    .sort((a, b) => Number(b.total) - Number(a.total));
}

/**
 * 1-based index of the parcel that lands on `reference`. For a one-shot
 * purchase, that's always 1. For installments, it's `(months elapsed since
 * firstParcelMonth) + 1`.
 */
function parcelIndexAt(firstParcelMonth: string | null, reference: MonthRef): number {
  if (!firstParcelMonth) return 1;
  const [fy, fm] = firstParcelMonth.slice(0, 7).split("-").map(Number);
  const [ry, rm] = reference.split("-").map(Number);
  const diff = (ry - fy) * 12 + (rm - fm) + 1;
  return diff > 0 ? diff : 1;
}

export type SimpleBucket = { key: string; total: string; count: number };

/**
 * Group incomes received in `reference` month by their `type`. Mirrors the
 * "Incomes by source" column on the spreadsheet (Salary, Bolsa, etc.).
 */
export function incomeBySource(
  incomes: AggregateInputs["incomes"],
  reference: MonthRef,
): SimpleBucket[] {
  const inMonth = incomes.filter((i) => isInMonth(i.date, reference));
  const buckets = new Map<string, { total: number; count: number }>();
  for (const i of inMonth) {
    const key = i.type ?? "other";
    const b = buckets.get(key) ?? { total: 0, count: 0 };
    b.total += Number(i.amount);
    b.count += 1;
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .map(([key, { total, count }]) => ({ key, total: total.toFixed(2), count }))
    .sort((a, b) => Number(b.total) - Number(a.total));
}

/**
 * Group cash expenses paid in `reference` month by their `method` (pix /
 * debit / cash). Mirrors the "Cash" subtable on the spreadsheet.
 */
export function cashByMethod(
  cashExpenses: AggregateInputs["cashExpenses"],
  reference: MonthRef,
): SimpleBucket[] {
  const inMonth = cashExpenses.filter((e) => isInMonth(e.date, reference));
  const buckets = new Map<string, { total: number; count: number }>();
  for (const e of inMonth) {
    const key = e.method ?? "other";
    const b = buckets.get(key) ?? { total: 0, count: 0 };
    b.total += Number(e.amount);
    b.count += 1;
    buckets.set(key, b);
  }
  return Array.from(buckets.entries())
    .map(([key, { total, count }]) => ({ key, total: total.toFixed(2), count }))
    .sort((a, b) => Number(b.total) - Number(a.total));
}

/**
 * Cumulative balance (sum of monthly balances) from the earliest data point
 * up to and including `reference`. Mirrors the spreadsheet's "Total Save"
 * running figure.
 *
 * Iterates aggregateMonth from the earliest month present in the dataset to
 * `reference`. O(months × dataset) — for a few-years history this is well
 * under a millisecond and avoids a separate cumulative table.
 */
export function cumulativeBalance(rows: AggregateInputs, reference: MonthRef): string {
  const dates: string[] = [];
  for (const i of rows.incomes) dates.push(i.date);
  for (const e of rows.cashExpenses) dates.push(e.date);
  for (const e of rows.creditExpenses) {
    if (e.firstParcelMonth) dates.push(e.firstParcelMonth);
  }
  for (const e of rows.fixedExpenses) dates.push(e.startDate);

  if (dates.length === 0) return "0.00";

  const earliest = dates.reduce((a, b) => (a < b ? a : b)).slice(0, 7);

  let acc = 0;
  let cursor = earliest;
  while (cursor <= reference) {
    const a = aggregateMonth(rows, cursor);
    acc += Number(a.balance);
    cursor = shiftMonth(cursor, 1);
  }
  return acc.toFixed(2);
}

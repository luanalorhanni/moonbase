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
  negateNumeric,
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
    categoryIcon?: string | null;
    categoryColor?: string;
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
    categoryIcon?: string | null;
    categoryColor?: string;
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
    categoryIcon?: string | null;
    categoryColor?: string;
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
  /**
   * Refunds (estornos) credited against credit expenses. They abate the credit
   * total in the invoice month(s) they land on. Card and category are inherited
   * from the parent expense (joined in by the query) so the credit is netted out
   * of the right buckets. Defaults to empty for callers that predate refunds.
   */
  creditRefunds?: ReadonlyArray<{
    id: string;
    referenceMonth: string;
    lastParcelMonth: string | null;
    parcelValue: string;
    cardId: string;
    cardName: string;
    cardColor?: string;
    subcategoryId: string;
    subcategoryName?: string;
    categoryName: string;
    categoryIcon?: string | null;
    categoryColor?: string;
    description?: string | null;
    expenseDescription?: string;
    totalParcels?: number;
  }>;
};

export type MonthAggregate = {
  reference: MonthRef;
  totalIncomes: string;
  totalCashExpenses: string;
  /** Credit total NET of refunds — this is what feeds `totalExpenses`. */
  totalCreditExpenses: string;
  /** Gross credit before refunds, for UIs that want to show the deduction. */
  totalCreditGross: string;
  /** Sum of refunds credited this month (a positive number). */
  totalCreditRefunds: string;
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
  const refunds = (rows.creditRefunds ?? []).filter((r) =>
    parcelSpansMonth(r.referenceMonth, r.lastParcelMonth ?? r.referenceMonth, reference),
  );

  const totalIncomes = sumNumeric(incomes.map((i) => i.amount));
  const totalCashExpenses = sumNumeric(cash.map((e) => e.amount));
  const totalCreditGross = sumNumeric(credit.map((e) => e.parcelValue));
  const totalCreditRefunds = sumNumeric(refunds.map((r) => r.parcelValue));
  const totalCreditExpenses = subtractNumeric(totalCreditGross, totalCreditRefunds);
  const totalFixedExpenses = sumNumeric(fixed.map((e) => e.monthlyAmount));
  const totalExpenses = sumNumeric([totalCashExpenses, totalCreditExpenses, totalFixedExpenses]);
  const balance = subtractNumeric(totalIncomes, totalExpenses);
  const totalCashReceivables = sumNumeric(cashRec.map((r) => r.amount));
  const totalCreditReceivables = sumNumeric(creditRec.map((r) => r.parcelValue));
  const totalReceivables = sumNumeric([totalCashReceivables, totalCreditReceivables]);

  const byCategory = groupSum(
    [
      ...cash.map((e) => ({
        key: e.categoryName,
        amount: e.amount,
        label: e.categoryName,
        icon: e.categoryIcon,
        color: e.categoryColor,
      })),
      ...credit.map((e) => ({
        key: e.categoryName,
        amount: e.parcelValue,
        label: e.categoryName,
        icon: e.categoryIcon,
        color: e.categoryColor,
      })),
      ...fixed.map((e) => ({
        key: e.categoryName,
        amount: e.monthlyAmount,
        label: e.categoryName,
        icon: e.categoryIcon,
        color: e.categoryColor,
      })),
      // Refunds subtract from their parent's category — negative amounts.
      ...refunds.map((r) => ({
        key: r.categoryName,
        amount: negateNumeric(r.parcelValue),
        label: r.categoryName,
        icon: r.categoryIcon,
        color: r.categoryColor,
      })),
    ],
    (r) => r.key,
    (r) => r.amount,
    (r) => ({ label: r.label, icon: r.icon, color: r.color }),
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
    ...refunds.map((r) => ({
      key: r.cardId,
      amount: negateNumeric(r.parcelValue),
      label: r.cardName,
      color: r.cardColor,
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
    totalCreditGross,
    totalCreditRefunds,
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
  /** Positive for a purchase; negative for a refund (estorno) credit. */
  parcelValue: string;
  totalParcels: number;
  /** 1-based parcel index that lands on `reference` (e.g. 3 of 12). */
  parcelIndex: number;
  purchaseDate: string;
  subcategoryName: string;
  categoryName: string;
  /** True when this line is a refund credit rather than a purchase. */
  isRefund?: boolean;
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
  creditRefunds: AggregateInputs["creditRefunds"] = [],
): InvoicePerCard[] {
  const inMonth = creditExpenses.filter((e) =>
    parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, reference),
  );
  const refundsInMonth = (creditRefunds ?? []).filter((r) =>
    parcelSpansMonth(r.referenceMonth, r.lastParcelMonth ?? r.referenceMonth, reference),
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

  // Refund credits reduce the card's invoice and appear as negative lines.
  for (const r of refundsInMonth) {
    const bucket = byCardId.get(r.cardId) ?? { count: 0, total: 0, items: [] as InvoiceItem[] };
    bucket.total -= Number(r.parcelValue);
    bucket.items.push({
      id: r.id,
      description: r.description || `estorno: ${r.expenseDescription ?? ""}`.trim(),
      parcelValue: negateNumeric(r.parcelValue),
      totalParcels: r.totalParcels ?? 1,
      parcelIndex: parcelIndexAt(r.referenceMonth, reference),
      purchaseDate: "",
      subcategoryName: r.subcategoryName ?? "",
      categoryName: r.categoryName,
      isRefund: true,
    });
    byCardId.set(r.cardId, bucket);
  }

  return cards
    .filter((c) => byCardId.has(c.id))
    .map((c) => {
      const b = byCardId.get(c.id)!;
      // Within a card, sort items by amount desc — heaviest charges first.
      const items = b.items.slice().sort((x, y) => Number(y.parcelValue) - Number(x.parcelValue));
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
 * Frozen monthly snapshot — same shape as the rows in `monthly_snapshots`,
 * but only the fields the cumulative needs. Used to seed history from
 * before active tracking (the user's pre-moonbase spreadsheet).
 */
export type HistoricalSnapshot = {
  /** First-day-of-month string `yyyy-mm-01`. */
  referenceMonth: string;
  /** Numeric strings — same convention as the rest of `numeric(12,2)`. */
  totalIncomes: string;
  totalExpenses: string;
};

/**
 * Cumulative balance (sum of monthly balances) from the earliest data point
 * up to and including `reference`. Mirrors the spreadsheet's "Total Save"
 * running figure.
 *
 * For months that have a `monthly_snapshots` row, the frozen
 * `incomes − expenses` is used; for months without a snapshot, the raw
 * data is aggregated on the fly. This lets the user seed history before
 * they started using moonbase without inserting fake transaction rows.
 */
export function cumulativeBalance(
  rows: AggregateInputs,
  reference: MonthRef,
  snapshots: ReadonlyArray<HistoricalSnapshot> = [],
): string {
  const snapByMonth = new Map<string, HistoricalSnapshot>();
  for (const s of snapshots) {
    snapByMonth.set(s.referenceMonth.slice(0, 7), s);
  }

  const dates: string[] = [];
  for (const i of rows.incomes) dates.push(i.date);
  for (const e of rows.cashExpenses) dates.push(e.date);
  for (const e of rows.creditExpenses) {
    if (e.firstParcelMonth) dates.push(e.firstParcelMonth);
  }
  for (const e of rows.fixedExpenses) dates.push(e.startDate);
  for (const s of snapshots) dates.push(s.referenceMonth);

  if (dates.length === 0) return "0.00";

  const earliest = dates.reduce((a, b) => (a < b ? a : b)).slice(0, 7);

  let acc = 0;
  let cursor = earliest;
  while (cursor <= reference) {
    const snap = snapByMonth.get(cursor);
    if (snap) {
      acc += Number(snap.totalIncomes) - Number(snap.totalExpenses);
    } else {
      acc += Number(aggregateMonth(rows, cursor).balance);
    }
    cursor = shiftMonth(cursor, 1);
  }
  return acc.toFixed(2);
}

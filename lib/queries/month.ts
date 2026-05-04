import "server-only";

import {
  aggregateMonth,
  cashByMethod,
  cumulativeBalance,
  incomeBySource,
  invoicePerCard,
  type AggregateInputs,
  type InvoicePerCard,
  type MonthAggregate,
  type SimpleBucket,
} from "@/lib/finance/aggregate";
import {
  currentMonthRef,
  fixedExpenseActiveInMonth,
  isInMonth,
  parcelSpansMonth,
  shiftMonth,
  type MonthRef,
} from "@/lib/finance/month";

import { listCards } from "@/lib/queries/cards";
import { listCashExpenses, type CashExpenseWithDetails } from "@/lib/queries/cash-expenses";
import { listCreditExpenses, type CreditExpenseWithDetails } from "@/lib/queries/credit-expenses";
import { listFixedExpenses, type FixedExpenseWithDetails } from "@/lib/queries/fixed-expenses";
import { listIncomes, type IncomeRow } from "@/lib/queries/incomes";
import {
  listCashReceivables,
  listCreditReceivables,
  type CashReceivableRow,
  type CreditReceivableWithCard,
} from "@/lib/queries/receivables";
import { listSnapshots, type SnapshotRow } from "@/lib/queries/snapshots";

export type MonthData = {
  reference: MonthRef;
  cashExpenses: CashExpenseWithDetails[];
  creditExpenses: CreditExpenseWithDetails[];
  fixedExpenses: FixedExpenseWithDetails[];
  incomes: IncomeRow[];
  cashReceivables: CashReceivableRow[];
  creditReceivables: CreditReceivableWithCard[];
};

export type MonthSummary = MonthAggregate & {
  data: MonthData;
  /** Cumulative balance through end of `reference` — "Total Save" on the sheet. */
  cumulativeSave: string;
  /**
   * The frozen monthly_snapshots row for `reference`, if any. Always
   * carried through to the UI so months that have both a snapshot AND
   * detailed records can show a small "snapshot also exists" notice.
   */
  historicalSnapshot: SnapshotRow | null;
  /**
   * True only when the month has a snapshot AND no raw transactions —
   * i.e. it was seeded from history before active tracking. The UI
   * renders a locked view in this case (no detail to show).
   */
  isHistoricalLocked: boolean;
  /**
   * Aggregate for the prior month — used by the dashboard to compute
   * deltas (incomes / expenses / "last month save" KPI). Computed here
   * from the full dataset (not the month-filtered slice) so the
   * comparison reflects every transaction of the previous month.
   */
  previousMonth: MonthAggregate;
  /** This month's credit invoice broken down per card (the bill that closes this month). */
  thisInvoice: InvoicePerCard[];
  /** Incomes received this month grouped by `type` (salary, bolsa, …). */
  bySource: SimpleBucket[];
  /** Cash expenses this month grouped by `method` (pix, debit, cash). */
  byCashMethod: SimpleBucket[];
  /**
   * Per-card breakdown of the *next* month's invoice — purchases the user is
   * currently making that haven't been billed yet. Only populated when the
   * viewed month is current or future; for past months it stays null because
   * a "next invoice" view of a historical month is just the following
   * month's already-closed bill.
   */
  nextInvoice: { reference: MonthRef; perCard: InvoicePerCard[]; total: string } | null;
};

export type FullDataset = {
  cashExpenses: CashExpenseWithDetails[];
  creditExpenses: CreditExpenseWithDetails[];
  fixedExpenses: FixedExpenseWithDetails[];
  incomes: IncomeRow[];
  cashReceivables: CashReceivableRow[];
  creditReceivables: CreditReceivableWithCard[];
};

export async function loadFullDataset(): Promise<FullDataset> {
  const [cashExpenses, creditExpenses, fixedExpenses, incomes, cashReceivables, creditReceivables] =
    await Promise.all([
      listCashExpenses(),
      listCreditExpenses(),
      listFixedExpenses(),
      listIncomes(),
      listCashReceivables(),
      listCreditReceivables(),
    ]);

  return {
    cashExpenses,
    creditExpenses,
    fixedExpenses,
    incomes,
    cashReceivables,
    creditReceivables,
  };
}

/**
 * Synthesise a `MonthAggregate` from a frozen snapshot — only the totals
 * are real, the per-category and per-card breakdowns are empty arrays.
 * Used for historical (pre-tracking) months so the KPI strip can still
 * render incomes / expenses / balance.
 */
function historicalAggregate(reference: MonthRef, snap: SnapshotRow): MonthAggregate {
  const incomes = snap.totalIncomes;
  const expenses = snap.totalExpenses;
  const balance = (Number(incomes) - Number(expenses)).toFixed(2);
  return {
    reference,
    totalIncomes: incomes,
    totalCashExpenses: "0.00",
    totalCreditExpenses: "0.00",
    totalFixedExpenses: expenses,
    totalExpenses: expenses,
    balance,
    totalCashReceivables: "0.00",
    totalCreditReceivables: "0.00",
    totalReceivables: "0.00",
    byCategory: [],
    byCard: [],
  };
}

function toAggregateInputs(dataset: FullDataset): AggregateInputs {
  return {
    cashExpenses: dataset.cashExpenses,
    creditExpenses: dataset.creditExpenses,
    fixedExpenses: dataset.fixedExpenses,
    incomes: dataset.incomes,
    cashReceivables: dataset.cashReceivables,
    creditReceivables: dataset.creditReceivables,
  };
}

export async function loadMonth(reference: MonthRef): Promise<MonthSummary> {
  const [dataset, cards, snapshots] = await Promise.all([
    loadFullDataset(),
    listCards(),
    listSnapshots(),
  ]);
  const inputs = toAggregateInputs(dataset);
  const historicalSnapshot =
    snapshots.find((s) => s.referenceMonth.toString().slice(0, 7) === reference) ?? null;

  // Detect whether the month has any raw transactions of its own.
  // Snapshots only "win" when there's nothing else — if the user has
  // detailed records for this month she wants to see them, with the
  // snapshot reduced to a small notice banner.
  const hasRawData =
    dataset.cashExpenses.some((e) => isInMonth(e.date, reference)) ||
    dataset.creditExpenses.some((e) =>
      parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, reference),
    ) ||
    dataset.fixedExpenses.some((e) =>
      fixedExpenseActiveInMonth(e.startDate, e.endDate, e.isActive, reference),
    ) ||
    dataset.incomes.some((i) => isInMonth(i.date, reference));

  const isHistoricalLocked = historicalSnapshot != null && !hasRawData;

  const aggregate = isHistoricalLocked
    ? historicalAggregate(reference, historicalSnapshot!)
    : aggregateMonth(inputs, reference);

  // Compute the previous month's aggregate from the FULL dataset (not
  // the per-month filtered slice). If that month is itself a snapshot-
  // only historical month, fall back to the snapshot totals so deltas
  // still make sense across the boundary.
  const prevRef = shiftMonth(reference, -1);
  const prevSnapshot =
    snapshots.find((s) => s.referenceMonth.toString().slice(0, 7) === prevRef) ?? null;
  const prevHasRaw =
    dataset.cashExpenses.some((e) => isInMonth(e.date, prevRef)) ||
    dataset.creditExpenses.some((e) =>
      parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, prevRef),
    ) ||
    dataset.fixedExpenses.some((e) =>
      fixedExpenseActiveInMonth(e.startDate, e.endDate, e.isActive, prevRef),
    ) ||
    dataset.incomes.some((i) => isInMonth(i.date, prevRef));
  const previousMonth =
    prevSnapshot && !prevHasRaw
      ? historicalAggregate(prevRef, prevSnapshot)
      : aggregateMonth(inputs, prevRef);

  const cardsForInvoice = cards.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    defaultClosingDay: c.defaultClosingDay,
    dueDay: c.dueDay,
  }));

  const thisInvoice = invoicePerCard(dataset.creditExpenses, cardsForInvoice, reference);
  const bySource = incomeBySource(inputs.incomes, reference);
  const byCashMethodList = cashByMethod(inputs.cashExpenses, reference);
  const cumulativeSave = cumulativeBalance(
    inputs,
    reference,
    snapshots.map((s) => ({
      referenceMonth: s.referenceMonth.toString().slice(0, 10),
      totalIncomes: s.totalIncomes,
      totalExpenses: s.totalExpenses,
    })),
  );

  const isCurrentOrFuture = reference >= currentMonthRef();
  const nextRef = shiftMonth(reference, 1);
  const nextInvoice = isCurrentOrFuture
    ? (() => {
        const perCard = invoicePerCard(dataset.creditExpenses, cardsForInvoice, nextRef);
        const total = perCard.reduce((sum, b) => sum + Number(b.total), 0).toFixed(2);
        return { reference: nextRef, perCard, total };
      })()
    : null;

  return {
    ...aggregate,
    cumulativeSave,
    historicalSnapshot,
    isHistoricalLocked,
    previousMonth,
    thisInvoice,
    bySource,
    byCashMethod: byCashMethodList,
    nextInvoice,
    data: {
      reference,
      cashExpenses: dataset.cashExpenses.filter((e) => isInMonth(e.date, reference)),
      creditExpenses: dataset.creditExpenses.filter((e) =>
        parcelSpansMonth(e.firstParcelMonth, e.lastParcelMonth, reference),
      ),
      fixedExpenses: dataset.fixedExpenses.filter((e) =>
        fixedExpenseActiveInMonth(e.startDate, e.endDate, e.isActive, reference),
      ),
      incomes: dataset.incomes.filter((i) => isInMonth(i.date, reference)),
      cashReceivables: dataset.cashReceivables.filter((r) =>
        isInMonth(r.expectedPaymentMonth, reference),
      ),
      creditReceivables: dataset.creditReceivables.filter((r) =>
        parcelSpansMonth(r.firstParcelMonth, r.lastParcelMonth, reference),
      ),
    },
  };
}

export { toAggregateInputs };

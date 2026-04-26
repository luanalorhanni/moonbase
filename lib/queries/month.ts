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
  const [dataset, cards] = await Promise.all([loadFullDataset(), listCards()]);
  const inputs = toAggregateInputs(dataset);
  const aggregate = aggregateMonth(inputs, reference);

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
  const cumulativeSave = cumulativeBalance(inputs, reference);

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

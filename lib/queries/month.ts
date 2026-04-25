import "server-only";

import { aggregateMonth, type AggregateInputs, type MonthAggregate } from "@/lib/finance/aggregate";
import {
  fixedExpenseActiveInMonth,
  isInMonth,
  parcelSpansMonth,
  type MonthRef,
} from "@/lib/finance/month";

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

export type MonthSummary = MonthAggregate & { data: MonthData };

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
  const dataset = await loadFullDataset();
  const aggregate = aggregateMonth(toAggregateInputs(dataset), reference);

  return {
    ...aggregate,
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

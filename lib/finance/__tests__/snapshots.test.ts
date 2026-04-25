import { describe, expect, it } from "vitest";

import type { MonthAggregate } from "../aggregate";
import { buildMonthlySnapshot, previousMonthRef } from "../snapshots";

const baseAggregate = (overrides: Partial<MonthAggregate> = {}): MonthAggregate => ({
  reference: "2026-04",
  totalIncomes: "5000.00",
  totalCashExpenses: "0.00",
  totalCreditExpenses: "0.00",
  totalFixedExpenses: "0.00",
  totalExpenses: "2000.00",
  balance: "3000.00",
  totalCashReceivables: "0.00",
  totalCreditReceivables: "0.00",
  totalReceivables: "0.00",
  byCategory: [],
  byCard: [],
  ...overrides,
});

describe("buildMonthlySnapshot", () => {
  it("composes a payload with cumulative total_save", () => {
    const snapshot = buildMonthlySnapshot({
      aggregate: baseAggregate(),
      liquidSavingsTotal: "1500.00",
      fixedIncomeTotal: "8000.00",
      previousTotalSave: "10000.00",
    });

    expect(snapshot).toEqual({
      monthLabel: "abril de 2026",
      referenceMonth: "2026-04-01",
      totalIncomes: "5000.00",
      totalExpenses: "2000.00",
      totalSave: "13000.00",
      totalLiquidSavings: "1500.00",
      totalFixedIncome: "8000.00",
    });
  });

  it("handles negative balances", () => {
    const snapshot = buildMonthlySnapshot({
      aggregate: baseAggregate({
        totalIncomes: "1000.00",
        totalExpenses: "1500.00",
        balance: "-500.00",
      }),
      liquidSavingsTotal: "0.00",
      fixedIncomeTotal: "0.00",
      previousTotalSave: "200.00",
    });
    expect(snapshot.totalSave).toBe("-300.00");
  });

  it("treats first-ever snapshot as previousTotalSave='0.00'", () => {
    const snapshot = buildMonthlySnapshot({
      aggregate: baseAggregate({ balance: "1234.56" }),
      liquidSavingsTotal: "0.00",
      fixedIncomeTotal: "0.00",
      previousTotalSave: "0.00",
    });
    expect(snapshot.totalSave).toBe("1234.56");
  });
});

describe("previousMonthRef", () => {
  it("returns previous month within the same year", () => {
    expect(previousMonthRef(new Date(2026, 3, 12))).toBe("2026-03");
  });

  it("wraps to previous december on January", () => {
    expect(previousMonthRef(new Date(2026, 0, 5))).toBe("2025-12");
  });
});

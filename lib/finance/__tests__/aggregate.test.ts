import { describe, expect, it } from "vitest";

import { aggregateMonth, aggregateYear, type AggregateInputs } from "../aggregate";

const empty: AggregateInputs = {
  cashExpenses: [],
  creditExpenses: [],
  fixedExpenses: [],
  incomes: [],
  cashReceivables: [],
  creditReceivables: [],
};

describe("aggregateMonth", () => {
  it("returns zeroes for an empty dataset", () => {
    const r = aggregateMonth(empty, "2026-04");
    expect(r.totalIncomes).toBe("0.00");
    expect(r.totalExpenses).toBe("0.00");
    expect(r.balance).toBe("0.00");
    expect(r.byCategory).toEqual([]);
    expect(r.byCard).toEqual([]);
  });

  it("sums all expense types and computes balance", () => {
    const inputs: AggregateInputs = {
      ...empty,
      incomes: [{ id: "i1", date: "2026-04-05", amount: "5000.00" }],
      cashExpenses: [
        {
          id: "c1",
          date: "2026-04-10",
          amount: "100.00",
          cardId: "card1",
          cardName: "Inter",
          subcategoryId: "s1",
          categoryName: "Alimentação",
        },
      ],
      creditExpenses: [
        {
          id: "cr1",
          firstParcelMonth: "2026-03-01",
          lastParcelMonth: "2026-06-01",
          parcelValue: "200.00",
          cardId: "card2",
          cardName: "Nubank",
          subcategoryId: "s2",
          categoryName: "Transporte",
        },
        {
          // does not span April
          id: "cr2",
          firstParcelMonth: "2026-01-01",
          lastParcelMonth: "2026-02-01",
          parcelValue: "999.00",
          cardId: "card2",
          cardName: "Nubank",
          subcategoryId: "s2",
          categoryName: "Transporte",
        },
      ],
      fixedExpenses: [
        {
          id: "f1",
          startDate: "2026-01-01",
          endDate: null,
          isActive: true,
          monthlyAmount: "50.00",
          cardId: "card1",
          cardName: "Inter",
          subcategoryId: "s3",
          categoryName: "Saúde",
        },
      ],
    };

    const r = aggregateMonth(inputs, "2026-04");
    expect(r.totalIncomes).toBe("5000.00");
    expect(r.totalCashExpenses).toBe("100.00");
    expect(r.totalCreditExpenses).toBe("200.00");
    expect(r.totalFixedExpenses).toBe("50.00");
    expect(r.totalExpenses).toBe("350.00");
    expect(r.balance).toBe("4650.00");
    expect(r.byCategory).toHaveLength(3);
    expect(r.byCard).toHaveLength(2);
  });
});

describe("aggregateYear", () => {
  it("produces 12 entries with correct references", () => {
    const r = aggregateYear(empty, 2026);
    expect(r).toHaveLength(12);
    expect(r[0].reference).toBe("2026-01");
    expect(r[11].reference).toBe("2026-12");
  });
});

import { describe, expect, it } from "vitest";

import {
  aggregateMonth,
  aggregateYear,
  cashByMethod,
  cumulativeBalance,
  incomeBySource,
  invoicePerCard,
  type AggregateInputs,
  type CardForInvoice,
} from "../aggregate";

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

describe("invoicePerCard", () => {
  const cards: CardForInvoice[] = [
    { id: "card1", name: "Nubank", color: "purple", defaultClosingDay: 20, dueDay: 27 },
    { id: "card2", name: "Inter", color: "orange", defaultClosingDay: 5, dueDay: 12 },
    { id: "card3", name: "BB", color: "yellow", defaultClosingDay: 15, dueDay: 22 },
  ];

  it("returns an empty list when no expenses span the reference month", () => {
    const r = invoicePerCard([], cards, "2026-05");
    expect(r).toEqual([]);
  });

  it("groups credit expenses by card and sums parcel values", () => {
    const credit: AggregateInputs["creditExpenses"] = [
      {
        id: "a",
        firstParcelMonth: "2026-05-01",
        lastParcelMonth: "2026-05-01",
        parcelValue: "100.00",
        cardId: "card1",
        cardName: "Nubank",
        subcategoryId: "s",
        categoryName: "x",
      },
      {
        id: "b",
        firstParcelMonth: "2026-04-01",
        lastParcelMonth: "2026-08-01",
        parcelValue: "50.00",
        cardId: "card1",
        cardName: "Nubank",
        subcategoryId: "s",
        categoryName: "x",
      },
      {
        id: "c",
        firstParcelMonth: "2026-05-01",
        lastParcelMonth: "2026-05-01",
        parcelValue: "20.00",
        cardId: "card2",
        cardName: "Inter",
        subcategoryId: "s",
        categoryName: "x",
      },
    ];

    const r = invoicePerCard(credit, cards, "2026-05");

    expect(r).toHaveLength(2);
    // sorted by total desc — Nubank 150 first
    expect(r[0]).toMatchObject({
      cardId: "card1",
      cardName: "Nubank",
      closingDay: 20,
      dueDay: 27,
      count: 2,
      total: "150.00",
    });
    expect(r[1]).toMatchObject({
      cardId: "card2",
      count: 1,
      total: "20.00",
    });
  });

  it("excludes cards with no purchases for the month", () => {
    const credit: AggregateInputs["creditExpenses"] = [
      {
        id: "x",
        firstParcelMonth: "2026-05-01",
        lastParcelMonth: "2026-05-01",
        parcelValue: "10.00",
        cardId: "card2",
        cardName: "Inter",
        subcategoryId: "s",
        categoryName: "x",
      },
    ];
    const r = invoicePerCard(credit, cards, "2026-05");
    expect(r).toHaveLength(1);
    expect(r[0].cardId).toBe("card2");
  });

  it("attaches per-card items with correct parcel index", () => {
    const credit: AggregateInputs["creditExpenses"] = [
      {
        id: "a",
        description: "Notebook",
        firstParcelMonth: "2026-03-01",
        lastParcelMonth: "2026-08-01",
        parcelValue: "200.00",
        totalParcels: 6,
        purchaseDate: "2026-02-25",
        cardId: "card1",
        cardName: "Nubank",
        subcategoryId: "s1",
        subcategoryName: "Eletronic",
        categoryName: "Shopping",
      },
      {
        id: "b",
        description: "Coxinha",
        firstParcelMonth: "2026-05-01",
        lastParcelMonth: "2026-05-01",
        parcelValue: "20.00",
        totalParcels: 1,
        purchaseDate: "2026-04-20",
        cardId: "card1",
        cardName: "Nubank",
        subcategoryId: "s2",
        subcategoryName: "Snacks",
        categoryName: "Restaurant",
      },
    ];
    const r = invoicePerCard(credit, cards, "2026-05");
    expect(r).toHaveLength(1);
    const card = r[0];
    expect(card.count).toBe(2);
    expect(card.items).toHaveLength(2);
    // sorted by amount desc
    expect(card.items[0].description).toBe("Notebook");
    // notebook: firstParcel=mar, ref=may → parcel 3 of 6
    expect(card.items[0].parcelIndex).toBe(3);
    expect(card.items[0].totalParcels).toBe(6);
    expect(card.items[1].description).toBe("Coxinha");
    expect(card.items[1].parcelIndex).toBe(1);
  });
});

describe("incomeBySource", () => {
  it("groups by type and sorts by total desc", () => {
    const incomes: AggregateInputs["incomes"] = [
      { id: "1", date: "2026-04-05", amount: "4100.00", type: "salary" },
      { id: "2", date: "2026-04-01", amount: "700.00", type: "research_grant" },
      { id: "3", date: "2026-04-15", amount: "120.00", type: "fee" },
      { id: "4", date: "2026-03-30", amount: "5000.00", type: "salary" },
    ];
    const r = incomeBySource(incomes, "2026-04");
    expect(r).toHaveLength(3);
    expect(r[0]).toEqual({ key: "salary", total: "4100.00", count: 1 });
    expect(r[1]).toEqual({ key: "research_grant", total: "700.00", count: 1 });
    expect(r[2]).toEqual({ key: "fee", total: "120.00", count: 1 });
  });

  it("falls back to 'other' for incomes without a type", () => {
    const r = incomeBySource([{ id: "1", date: "2026-04-05", amount: "100.00" }], "2026-04");
    expect(r).toEqual([{ key: "other", total: "100.00", count: 1 }]);
  });
});

describe("cashByMethod", () => {
  it("groups by method (pix/debit/cash)", () => {
    const cash: AggregateInputs["cashExpenses"] = [
      {
        id: "1",
        date: "2026-04-05",
        amount: "50.00",
        cardId: "c",
        cardName: "Inter",
        subcategoryId: "s",
        categoryName: "x",
        method: "pix",
      },
      {
        id: "2",
        date: "2026-04-10",
        amount: "30.00",
        cardId: "c",
        cardName: "Inter",
        subcategoryId: "s",
        categoryName: "x",
        method: "pix",
      },
      {
        id: "3",
        date: "2026-04-12",
        amount: "100.00",
        cardId: "c",
        cardName: "Inter",
        subcategoryId: "s",
        categoryName: "x",
        method: "debit",
      },
    ];
    const r = cashByMethod(cash, "2026-04");
    expect(r).toHaveLength(2);
    expect(r[0]).toEqual({ key: "debit", total: "100.00", count: 1 });
    expect(r[1]).toEqual({ key: "pix", total: "80.00", count: 2 });
  });
});

describe("cumulativeBalance", () => {
  it("returns zero on empty input", () => {
    expect(cumulativeBalance(empty, "2026-04")).toBe("0.00");
  });

  it("sums monthly balances from earliest data up to and including reference", () => {
    const inputs: AggregateInputs = {
      ...empty,
      incomes: [
        { id: "1", date: "2026-01-05", amount: "1000.00" },
        { id: "2", date: "2026-02-05", amount: "1000.00" },
        { id: "3", date: "2026-03-05", amount: "1000.00" },
      ],
      cashExpenses: [
        {
          id: "c1",
          date: "2026-02-10",
          amount: "300.00",
          cardId: "x",
          cardName: "x",
          subcategoryId: "s",
          categoryName: "x",
        },
      ],
    };
    // Jan: 1000 - 0 = 1000; Feb: 1000 - 300 = 700; Mar: 1000 - 0 = 1000.
    expect(cumulativeBalance(inputs, "2026-01")).toBe("1000.00");
    expect(cumulativeBalance(inputs, "2026-02")).toBe("1700.00");
    expect(cumulativeBalance(inputs, "2026-03")).toBe("2700.00");
  });
});

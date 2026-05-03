import { describe, expect, it } from "vitest";

import {
  getActualClosingDay,
  getActualDueDay,
  type CardClosing,
  type CardForClosings,
} from "../closings";

const card: CardForClosings = { id: "card-1", defaultClosingDay: 25, dueDay: 5 };

function month(year: number, monthIndexZero: number): Date {
  return new Date(year, monthIndexZero, 1);
}

describe("getActualClosingDay", () => {
  it("returns the card's default when no override exists", () => {
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 3), // April 2026
        cardClosings: [],
      }),
    ).toBe(25);
  });

  it("returns the override when one matches both card and month", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 23 },
    ];
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(23);
  });

  it("ignores overrides for a different card", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-2", referenceMonth: month(2026, 3), closingDay: 1 },
    ];
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(25);
  });

  it("ignores overrides from later months (no backward propagation)", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 4), closingDay: 1 },
    ];
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(25);
  });

  it("carries forward across year boundaries", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 11), closingDay: 20 },
    ];
    // January 2027 inherits the December 2026 override.
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2027, 0),
        cardClosings: overrides,
      }),
    ).toBe(20);
    // The override month itself uses the explicit value.
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 11),
        cardClosings: overrides,
      }),
    ).toBe(20);
  });

  it("uses the most recent prior override when several exist", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 0), closingDay: 22 },
      { cardId: "card-1", referenceMonth: month(2026, 5), closingDay: 18 },
      { cardId: "card-1", referenceMonth: month(2026, 8), closingDay: 24 },
    ];
    // March uses the January override (22).
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 2),
        cardClosings: overrides,
      }),
    ).toBe(22);
    // July uses the June override (18).
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 6),
        cardClosings: overrides,
      }),
    ).toBe(18);
    // November uses the September override (24).
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 10),
        cardClosings: overrides,
      }),
    ).toBe(24);
  });

  it("compares only year and month — any day inside the reference month works", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 21 },
    ];
    expect(
      getActualClosingDay({
        card,
        referenceMonth: new Date(2026, 3, 17),
        cardClosings: overrides,
      }),
    ).toBe(21);
  });
});

describe("getActualDueDay", () => {
  it("returns the card's default when no override exists", () => {
    expect(
      getActualDueDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: [],
      }),
    ).toBe(5);
  });

  it("returns the override when set", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 25, dueDay: 8 },
    ];
    expect(
      getActualDueDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(8);
  });

  it("falls back to card default when an override sets only closing", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 22 },
    ];
    expect(
      getActualDueDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(5);
  });

  it("carries forward the latest override that sets dueDay", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 0), closingDay: 25, dueDay: 7 },
      // April override changes only closingDay; due day stays 7 from January.
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 22 },
    ];
    expect(
      getActualDueDay({
        card,
        referenceMonth: month(2026, 3),
        cardClosings: overrides,
      }),
    ).toBe(7);
  });

  it("returns null when no card default and no override is set", () => {
    expect(
      getActualDueDay({
        card: { id: "card-1", defaultClosingDay: 25 },
        referenceMonth: month(2026, 3),
        cardClosings: [],
      }),
    ).toBeNull();
  });
});

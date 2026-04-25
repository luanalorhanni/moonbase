import { describe, expect, it } from "vitest";

import { getActualClosingDay, type CardClosing, type CardForClosings } from "../closings";

const card: CardForClosings = { id: "card-1", defaultClosingDay: 25 };

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

  it("ignores overrides for a different month", () => {
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

  it("respects year boundaries when matching the override month", () => {
    const overrides: CardClosing[] = [
      // December 2026 override
      { cardId: "card-1", referenceMonth: month(2026, 11), closingDay: 20 },
    ];
    // January 2027 must not pick up the December override.
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2027, 0),
        cardClosings: overrides,
      }),
    ).toBe(25);
    // December 2026 itself should pick it up.
    expect(
      getActualClosingDay({
        card,
        referenceMonth: month(2026, 11),
        cardClosings: overrides,
      }),
    ).toBe(20);
  });

  it("compares only year and month — any day inside the reference month works", () => {
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: month(2026, 3), closingDay: 21 },
    ];
    // Pass a mid-month date — function should still match April 2026.
    expect(
      getActualClosingDay({
        card,
        referenceMonth: new Date(2026, 3, 17),
        cardClosings: overrides,
      }),
    ).toBe(21);
  });
});

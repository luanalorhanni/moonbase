import { describe, expect, it } from "vitest";

import { type CardClosing, type CardForClosings } from "../closings";
import { computeParcelDates } from "../parcels";

const card: CardForClosings = { id: "card-1", defaultClosingDay: 25 };
const noOverrides: ReadonlyArray<CardClosing> = [];

function ymd(year: number, monthIndexZero: number, day: number): Date {
  return new Date(year, monthIndexZero, day);
}

describe("computeParcelDates — month attribution", () => {
  it("attributes a purchase before the closing day to the purchase month", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10), // April 10
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 3, 1));
    expect(result.lastParcelMonth).toEqual(ymd(2026, 3, 1));
  });

  it("treats the closing day as inclusive — purchase ON the closing day stays in the month", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 25), // April 25, exactly the closing day
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 3, 1));
  });

  it("rolls a purchase after the closing day to the next month", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 26), // April 26, after closing
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 4, 1)); // May
  });

  it("rolls across a year boundary when December purchase is past closing", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 11, 30), // December 30, after closing day 25
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2027, 0, 1)); // January 2027
    expect(result.firstParcelDate).toEqual(ymd(2027, 0, 25));
  });
});

describe("computeParcelDates — multi-parcel arithmetic", () => {
  it("single parcel makes first and last equal", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10),
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(result.lastParcelMonth);
    expect(result.firstParcelDate).toEqual(result.lastParcelDate);
  });

  it("3 parcels span two month-additions from the first parcel", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10), // April 10 → first April
      totalParcels: 3,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 3, 1));
    expect(result.lastParcelMonth).toEqual(ymd(2026, 5, 1)); // June
  });

  it("12 parcels span the full year", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 0, 5), // January 5
      totalParcels: 12,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 0, 1));
    expect(result.lastParcelMonth).toEqual(ymd(2026, 11, 1)); // December
  });

  it("24 parcels stretch into the next year", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 0, 5), // January 5
      totalParcels: 24,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 0, 1));
    expect(result.lastParcelMonth).toEqual(ymd(2027, 11, 1)); // December 2027
  });
});

describe("computeParcelDates — card_closings overrides", () => {
  it("uses the override to decide whether the purchase rolls forward", () => {
    // Override April closing day to 12 — a purchase on April 15 should now roll.
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: ymd(2026, 3, 1), closingDay: 12 },
    ];
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 15),
      totalParcels: 1,
      cardClosings: overrides,
    });
    // 15 > 12 → rolls to May.
    expect(result.firstParcelMonth).toEqual(ymd(2026, 4, 1));
  });

  it("uses the override of the LAST parcel's month for the closing date", () => {
    // 3 parcels starting April: last is June. Override June closing day to 18.
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: ymd(2026, 5, 1), closingDay: 18 },
    ];
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10),
      totalParcels: 3,
      cardClosings: overrides,
    });
    expect(result.lastParcelMonth).toEqual(ymd(2026, 5, 1));
    expect(result.lastParcelDate).toEqual(ymd(2026, 5, 18));
  });
});

describe("computeParcelDates — end-of-month clamping", () => {
  it("clamps closing day 31 to the last day of February (non-leap year)", () => {
    const card31: CardForClosings = { id: "card-1", defaultClosingDay: 31 };
    // Purchase January 5 with 2 parcels: first January, last February.
    const result = computeParcelDates({
      card: card31,
      purchaseDate: ymd(2026, 0, 5),
      totalParcels: 2,
      cardClosings: noOverrides,
    });
    expect(result.lastParcelMonth).toEqual(ymd(2026, 1, 1));
    expect(result.lastParcelDate).toEqual(ymd(2026, 1, 28)); // 2026 is not a leap year
  });

  it("clamps closing day 31 to February 29 in a leap year", () => {
    const card31: CardForClosings = { id: "card-1", defaultClosingDay: 31 };
    const result = computeParcelDates({
      card: card31,
      purchaseDate: ymd(2028, 0, 5),
      totalParcels: 2,
      cardClosings: noOverrides,
    });
    expect(result.lastParcelDate).toEqual(ymd(2028, 1, 29)); // 2028 is a leap year
  });

  it("clamps closing day 30 to February 28 in a non-leap year", () => {
    const card30: CardForClosings = { id: "card-1", defaultClosingDay: 30 };
    const result = computeParcelDates({
      card: card30,
      purchaseDate: ymd(2026, 0, 5),
      totalParcels: 2,
      cardClosings: noOverrides,
    });
    expect(result.lastParcelDate).toEqual(ymd(2026, 1, 28));
  });
});

describe("computeParcelDates — invalid input", () => {
  it("throws when totalParcels is zero", () => {
    expect(() =>
      computeParcelDates({
        card,
        purchaseDate: ymd(2026, 3, 10),
        totalParcels: 0,
        cardClosings: noOverrides,
      }),
    ).toThrow();
  });

  it("throws when totalParcels is negative", () => {
    expect(() =>
      computeParcelDates({
        card,
        purchaseDate: ymd(2026, 3, 10),
        totalParcels: -1,
        cardClosings: noOverrides,
      }),
    ).toThrow();
  });

  it("throws when totalParcels is fractional", () => {
    expect(() =>
      computeParcelDates({
        card,
        purchaseDate: ymd(2026, 3, 10),
        totalParcels: 2.5,
        cardClosings: noOverrides,
      }),
    ).toThrow();
  });
});

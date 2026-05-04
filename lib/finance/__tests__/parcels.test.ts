import { describe, expect, it } from "vitest";

import { type CardClosing, type CardForClosings } from "../closings";
import { computeParcelDates } from "../parcels";

const card: CardForClosings = { id: "card-1", defaultClosingDay: 25 };
const noOverrides: ReadonlyArray<CardClosing> = [];

function ymd(year: number, monthIndexZero: number, day: number): Date {
  return new Date(year, monthIndexZero, day);
}

describe("computeParcelDates — month attribution", () => {
  it("attributes a purchase before the closing day to the month *after* purchase month (paid month)", () => {
    // April 10 closes on April 25 → bill paid in May.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10),
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 4, 1)); // May
    expect(result.lastParcelMonth).toEqual(ymd(2026, 4, 1));
    // The bill that contains it closed on April 25.
    expect(result.firstParcelDate).toEqual(ymd(2026, 3, 25));
  });

  it("treats the closing day as inclusive — purchase ON the closing day still pays next month", () => {
    // April 25 closes on April 25 → still paid in May.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 25),
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 4, 1));
  });

  it("rolls a purchase after the closing day two months forward", () => {
    // April 26 misses the April 25 close → next bill closes May 25 → paid June.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 26),
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 5, 1)); // June
    expect(result.firstParcelDate).toEqual(ymd(2026, 4, 25)); // closed in May
  });

  it("rolls across a year boundary when December purchase is past closing", () => {
    // Dec 30 misses Dec 25 close → next close Jan 25 → paid February 2027.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 11, 30),
      totalParcels: 1,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2027, 1, 1)); // February 2027
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
    // April 10 → first parcel paid May, last paid July.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10),
      totalParcels: 3,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 4, 1)); // May
    expect(result.lastParcelMonth).toEqual(ymd(2026, 6, 1)); // July
  });

  it("12 parcels span the full year (Feb..Jan paid)", () => {
    // Jan 5 → first parcel paid Feb, last paid Jan next year.
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 0, 5),
      totalParcels: 12,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 1, 1)); // February
    expect(result.lastParcelMonth).toEqual(ymd(2027, 0, 1)); // January 2027
  });

  it("24 parcels stretch into the year after next", () => {
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 0, 5),
      totalParcels: 24,
      cardClosings: noOverrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 1, 1));
    expect(result.lastParcelMonth).toEqual(ymd(2028, 0, 1)); // January 2028
  });
});

describe("computeParcelDates — card_closings overrides", () => {
  it("uses the override to decide whether the purchase rolls forward", () => {
    // April closing 12 — purchase April 15 misses → next close May 25 → paid June.
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: ymd(2026, 3, 1), closingDay: 12 },
    ];
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 15),
      totalParcels: 1,
      cardClosings: overrides,
    });
    expect(result.firstParcelMonth).toEqual(ymd(2026, 5, 1)); // June (paid)
  });

  it("uses the override of the LAST parcel's closing month for the closing date", () => {
    // April 10 → first parcel closes April, paid May. 3 parcels → last
    // closes June, paid July. Override June closing day to 18.
    const overrides: CardClosing[] = [
      { cardId: "card-1", referenceMonth: ymd(2026, 5, 1), closingDay: 18 },
    ];
    const result = computeParcelDates({
      card,
      purchaseDate: ymd(2026, 3, 10),
      totalParcels: 3,
      cardClosings: overrides,
    });
    expect(result.lastParcelMonth).toEqual(ymd(2026, 6, 1)); // July (paid)
    expect(result.lastParcelDate).toEqual(ymd(2026, 5, 18)); // closed June 18
  });
});

describe("computeParcelDates — end-of-month clamping", () => {
  it("clamps closing day 31 to the last day of February (non-leap year)", () => {
    const card31: CardForClosings = { id: "card-1", defaultClosingDay: 31 };
    // Jan 5 → first closes Jan 31, paid Feb. Last (2 parcels) closes Feb 28, paid March.
    const result = computeParcelDates({
      card: card31,
      purchaseDate: ymd(2026, 0, 5),
      totalParcels: 2,
      cardClosings: noOverrides,
    });
    expect(result.lastParcelMonth).toEqual(ymd(2026, 2, 1)); // March (paid)
    expect(result.lastParcelDate).toEqual(ymd(2026, 1, 28)); // Feb 28 closing
  });

  it("clamps closing day 31 to February 29 in a leap year", () => {
    const card31: CardForClosings = { id: "card-1", defaultClosingDay: 31 };
    const result = computeParcelDates({
      card: card31,
      purchaseDate: ymd(2028, 0, 5),
      totalParcels: 2,
      cardClosings: noOverrides,
    });
    expect(result.lastParcelDate).toEqual(ymd(2028, 1, 29));
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

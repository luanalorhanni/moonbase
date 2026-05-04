/**
 * Credit-card parcel calculations. Pure logic — no database access, no
 * timezone math. All Date inputs and outputs are interpreted in the user's
 * local calendar (consistent with the `date` columns in the schema, which
 * carry no time-of-day component).
 *
 * The single source of truth for parcel derivation per the architecture
 * (section 6.2) — referencing this file is the only way to compute first
 * and last parcel months/dates. Tests live in __tests__/parcels.test.ts.
 */

import { addMonths, lastDayOfMonth, startOfMonth } from "date-fns";

import { getActualClosingDay, type CardClosing, type CardForClosings } from "./closings";

export type ComputeParcelDatesInput = {
  card: CardForClosings;
  /** Day-resolution date — `purchaseDate.getDate()` is the day-of-month. */
  purchaseDate: Date;
  /** Number of installments. Must be >= 1. */
  totalParcels: number;
  cardClosings: ReadonlyArray<CardClosing>;
};

export type ParcelDates = {
  /** First day of the month the first parcel lands on the statement. */
  firstParcelMonth: Date;
  /** First day of the month the last parcel lands on the statement. */
  lastParcelMonth: Date;
  /** Closing date of the first parcel's statement (clamped to short months). */
  firstParcelDate: Date;
  /** Closing date of the last parcel's statement (clamped to short months). */
  lastParcelDate: Date;
};

/**
 * Computes the four derived dates for a credit-card purchase.
 *
 * Convention: `firstParcelMonth` / `lastParcelMonth` are the **months the
 * user pays the parcel**, not the closing months. A purchase on the bill
 * that closes 25/03 is paid in early April, so it shows up under "April"
 * in the monthly views — that matches how the user thinks of bills
 * ("a fatura de abril").
 *
 * Rule of attribution (Brazilian credit-card convention):
 *   - If `purchaseDate.day <= closingDay(purchaseMonth)`, the purchase
 *     lands on the statement that **closes during purchaseMonth** and
 *     is paid the month after (firstParcelMonth = purchaseMonth + 1).
 *   - Otherwise, it rolls forward — closes next month, paid the month
 *     after that (firstParcelMonth = purchaseMonth + 2).
 *
 * `closingDay` for a given month is taken from `card_closings` if an
 * override exists, otherwise `card.defaultClosingDay`.
 *
 * `firstParcelDate` / `lastParcelDate` are the closing dates of those
 * statements (which sit in the month BEFORE the parcel month — that's
 * when the bank actually cut the bill). Closing days beyond the month's
 * last day (e.g., 31 in February) are clamped to the last day —
 * matching how banks themselves resolve impossible dates.
 */
export function computeParcelDates(input: ComputeParcelDatesInput): ParcelDates {
  const { card, purchaseDate, totalParcels, cardClosings } = input;

  if (!Number.isInteger(totalParcels) || totalParcels < 1) {
    throw new Error("totalParcels must be a positive integer.");
  }

  const purchaseMonth = startOfMonth(purchaseDate);
  const closingDayOfPurchaseMonth = getActualClosingDay({
    card,
    referenceMonth: purchaseMonth,
    cardClosings,
  });

  const purchaseDayOfMonth = purchaseDate.getDate();
  // The month whose closing statement the purchase lands on.
  const firstClosingMonth =
    purchaseDayOfMonth <= closingDayOfPurchaseMonth ? purchaseMonth : addMonths(purchaseMonth, 1);
  // The month the user actually pays it — one month after closing.
  const firstParcelMonth = addMonths(firstClosingMonth, 1);
  const lastClosingMonth = addMonths(firstClosingMonth, totalParcels - 1);
  const lastParcelMonth = addMonths(lastClosingMonth, 1);

  return {
    firstParcelMonth,
    lastParcelMonth,
    firstParcelDate: closingDateForMonth({ month: firstClosingMonth, card, cardClosings }),
    lastParcelDate: closingDateForMonth({ month: lastClosingMonth, card, cardClosings }),
  };
}

function closingDateForMonth(args: {
  month: Date;
  card: CardForClosings;
  cardClosings: ReadonlyArray<CardClosing>;
}): Date {
  const closingDay = getActualClosingDay({
    card: args.card,
    referenceMonth: args.month,
    cardClosings: args.cardClosings,
  });
  const lastDay = lastDayOfMonth(args.month).getDate();
  const day = Math.min(closingDay, lastDay);
  return new Date(args.month.getFullYear(), args.month.getMonth(), day);
}

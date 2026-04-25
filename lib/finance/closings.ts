/**
 * Card closing-day lookup. Per ADR-006, Brazilian credit cards have closing
 * days that drift month-to-month due to weekends and holidays. The
 * card_closings table records overrides; when a month has no override the
 * card's default_closing_day applies.
 *
 * This file is pure: no database access. The caller passes the relevant
 * rows in. Tests live in __tests__/closings.test.ts.
 */

export type CardForClosings = {
  id: string;
  defaultClosingDay: number;
};

export type CardClosing = {
  cardId: string;
  /** First day of the month the override applies to (yyyy-mm-01). */
  referenceMonth: Date;
  closingDay: number;
};

/**
 * Returns the actual closing day for a given card in a given month.
 * Falls back to the card's default when no override exists.
 *
 * `referenceMonth` should be the first day of the target month; the
 * function only compares year and month so any day works in practice.
 */
export function getActualClosingDay(args: {
  card: CardForClosings;
  referenceMonth: Date;
  cardClosings: ReadonlyArray<CardClosing>;
}): number {
  const { card, referenceMonth, cardClosings } = args;

  const targetYear = referenceMonth.getFullYear();
  const targetMonth = referenceMonth.getMonth();

  const override = cardClosings.find(
    (cc) =>
      cc.cardId === card.id &&
      cc.referenceMonth.getFullYear() === targetYear &&
      cc.referenceMonth.getMonth() === targetMonth,
  );

  return override ? override.closingDay : card.defaultClosingDay;
}

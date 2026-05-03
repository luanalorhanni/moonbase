/**
 * Card closing/due day lookup. Per ADR-006, Brazilian credit cards have
 * closing and due days that drift month-to-month due to weekends and
 * holidays. The card_closings table records overrides; when a month has no
 * override the most recent prior override applies (carry-forward), falling
 * back to the card's defaults when no prior override exists.
 *
 * This file is pure: no database access. The caller passes the relevant
 * rows in. Tests live in __tests__/closings.test.ts.
 */

export type CardForClosings = {
  id: string;
  defaultClosingDay: number;
  dueDay?: number | null;
};

export type CardClosing = {
  cardId: string;
  /** First day of the month the override applies to (yyyy-mm-01). */
  referenceMonth: Date;
  closingDay: number;
  /** Optional due-day override for this month. Null = inherit from card. */
  dueDay?: number | null;
};

function monthIndex(d: Date): number {
  return d.getFullYear() * 12 + d.getMonth();
}

/**
 * Returns the most recent override at or before `referenceMonth` for the
 * given card, or null if none exists. Used by both `getActualClosingDay`
 * and `getActualDueDay` so carry-forward semantics stay identical.
 */
function findLatestOverride(
  cardId: string,
  referenceMonth: Date,
  cardClosings: ReadonlyArray<CardClosing>,
): CardClosing | null {
  const targetIdx = monthIndex(referenceMonth);
  let best: CardClosing | null = null;
  let bestIdx = -Infinity;
  for (const cc of cardClosings) {
    if (cc.cardId !== cardId) continue;
    const idx = monthIndex(cc.referenceMonth);
    if (idx > targetIdx) continue;
    if (idx > bestIdx) {
      best = cc;
      bestIdx = idx;
    }
  }
  return best;
}

/**
 * Returns the actual closing day for a given card in a given month.
 * Picks the most recent override at or before the target month
 * (carry-forward), falling back to the card's default when no prior
 * override exists.
 */
export function getActualClosingDay(args: {
  card: CardForClosings;
  referenceMonth: Date;
  cardClosings: ReadonlyArray<CardClosing>;
}): number {
  const { card, referenceMonth, cardClosings } = args;
  const override = findLatestOverride(card.id, referenceMonth, cardClosings);
  return override ? override.closingDay : card.defaultClosingDay;
}

/**
 * Returns the actual due day for a given card in a given month.
 * Same carry-forward logic as `getActualClosingDay`. Falls back to
 * `card.dueDay` (and finally null) when no override sets a due day.
 *
 * Note: an override row that leaves `dueDay` null does NOT shadow earlier
 * overrides — it simply means "this month's closing changed but the due
 * day didn't." We walk back to find the latest override that does set
 * `dueDay`, then fall back to the card default.
 */
export function getActualDueDay(args: {
  card: CardForClosings;
  referenceMonth: Date;
  cardClosings: ReadonlyArray<CardClosing>;
}): number | null {
  const { card, referenceMonth, cardClosings } = args;
  const targetIdx = monthIndex(referenceMonth);
  let best: CardClosing | null = null;
  let bestIdx = -Infinity;
  for (const cc of cardClosings) {
    if (cc.cardId !== card.id) continue;
    if (cc.dueDay == null) continue;
    const idx = monthIndex(cc.referenceMonth);
    if (idx > targetIdx) continue;
    if (idx > bestIdx) {
      best = cc;
      bestIdx = idx;
    }
  }
  if (best && best.dueDay != null) return best.dueDay;
  return card.dueDay ?? null;
}

import "server-only";

import { revalidateTag } from "next/cache";

/**
 * Central registry of cache tags. Every cached query in `lib/queries/*` is
 * tagged with one or more of these, and every server action calls the matching
 * invalidator so the tag-based cache stays consistent.
 *
 * Why centralised: tags are stringly-typed in `next/cache`. Keeping them in a
 * single object guarantees actions and queries cannot drift on a typo.
 */
export const TAGS = {
  cards: "cards",
  cardClosings: "card-closings",
  categories: "categories",
  subcategories: "subcategories",
  creditExpenses: "credit-expenses",
  cashExpenses: "cash-expenses",
  fixedExpenses: "fixed-expenses",
  incomes: "incomes",
  cashReceivables: "cash-receivables",
  creditReceivables: "credit-receivables",
  creditReceivableParcelsPaid: "credit-receivable-parcels-paid",
  userSettings: "user-settings",
  googleCalendarTokens: "google-calendar-tokens",
  habits: "habits",
  habitCategories: "habit-categories",
  habitLogs: "habit-logs",
  liquidSavings: "liquid-savings",
  fixedIncome: "fixed-income",
  investmentUpdates: "investment-updates",
  snapshots: "snapshots",
  journalEntries: "journal-entries",
  journalQuotes: "journal-quotes",
  monthlyBudgets: "monthly-budgets",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];

function bust(...tags: Tag[]) {
  // Next.js 16 requires the second `profile` argument. "max" is the
  // recommended default — it marks the cache entry stale and serves
  // stale-while-revalidate, so reads stay fast and the next visit triggers a
  // background refresh.
  for (const tag of tags) revalidateTag(tag, "max");
}

/**
 * A card's name/color is denormalised onto every expense and credit-receivable
 * row by the join queries. Editing a card therefore invalidates everything
 * that embeds those values.
 */
export function invalidateCardGraph() {
  bust(
    TAGS.cards,
    TAGS.creditExpenses,
    TAGS.cashExpenses,
    TAGS.fixedExpenses,
    TAGS.creditReceivables,
  );
}

/**
 * Categories and subcategories names are joined into expense rows. Editing
 * either invalidates expense-shaped queries.
 */
export function invalidateCategoryGraph() {
  bust(
    TAGS.categories,
    TAGS.subcategories,
    TAGS.creditExpenses,
    TAGS.cashExpenses,
    TAGS.fixedExpenses,
  );
}

export function invalidateSubcategoryGraph() {
  bust(TAGS.subcategories, TAGS.creditExpenses, TAGS.cashExpenses, TAGS.fixedExpenses);
}

export function invalidate(...tags: Tag[]) {
  bust(...tags);
}

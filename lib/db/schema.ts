/**
 * Database schema — canonical reference is `docs/architecture.md` section 5.3.
 *
 * Conventions (from section 6):
 *  - snake_case in the database, camelCase in TypeScript (Drizzle handles the
 *    mapping via the column name argument).
 *  - Every domain table includes user_id (uuid, not null) so Row Level
 *    Security (ADR-008) can scope rows to auth.uid(). RLS policies live in a
 *    separate hand-written migration; the schema only declares the columns.
 *  - Money is numeric(12, 2) and surfaces as a string in TS to avoid
 *    floating-point error (section 6.3).
 *  - Reference months are stored as `date` always normalized to day 1.
 *  - Soft delete only for categories/subcategories: foreign keys use
 *    onDelete: 'restrict' (section 5.2.2 invariants).
 */

import {
  boolean,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  smallint,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const cardTypeEnum = pgEnum("card_type", ["credit", "account"]);
export const cashMethodEnum = pgEnum("cash_method", ["pix", "debit", "cash"]);
export const paymentMethodEnum = pgEnum("payment_method", ["cash", "credit"]);
export const incomeTypeEnum = pgEnum("income_type", [
  "salary",
  "research_grant",
  "refund",
  "fee",
  "sale",
  "other",
]);
export const loanTypeEnum = pgEnum("loan_type", ["pix", "debit", "cash"]);
export const snapshotStatusEnum = pgEnum("snapshot_status", ["locked", "draft"]);
export const habitPolarityEnum = pgEnum("habit_polarity", ["do", "avoid"]);
export const habitScheduleEnum = pgEnum("habit_schedule", ["daily", "weekly_target"]);
export const investmentKindEnum = pgEnum("investment_kind", ["liquid_savings", "fixed_income"]);

/**
 * Color is stored as a free-form text string holding a 6-digit hex code
 * (e.g. "#a855f7"). Was previously a fixed `pgEnum`; the migration
 * 0002_hex_colors.sql converts the existing values.
 */

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export const categories = pgTable("categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#a855f7"),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subcategories = pgTable("subcategories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "restrict" }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cards = pgTable("cards", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  type: cardTypeEnum("type").notNull(),
  bank: text("bank"),
  defaultClosingDay: integer("default_closing_day"),
  dueDay: integer("due_day"),
  limitAmount: numeric("limit_amount", { precision: 12, scale: 2 }),
  color: text("color").notNull().default("#a855f7"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cardClosings = pgTable(
  "card_closings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    referenceMonth: date("reference_month").notNull(), // always day 1
    closingDay: integer("closing_day").notNull(),
    /** Optional override for the bill due day. Falls back to cards.dueDay. */
    dueDay: integer("due_day"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("card_closings_card_month_unique").on(t.cardId, t.referenceMonth)],
);

export const creditExpenses = pgTable("credit_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "restrict" }),
  subcategoryId: uuid("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "restrict" }),
  purchaseDate: date("purchase_date").notNull(),
  totalParcels: integer("total_parcels").notNull(),
  parcelValue: numeric("parcel_value", { precision: 12, scale: 2 }).notNull(),
  // Derived fields — computed by lib/finance/parcels.ts on save (ADR-006).
  firstParcelDate: date("first_parcel_date"),
  lastParcelDate: date("last_parcel_date"),
  firstParcelMonth: date("first_parcel_month"),
  lastParcelMonth: date("last_parcel_month"),
  manualOverride: boolean("manual_override").notNull().default(false),
  originalSpreadsheetId: text("original_spreadsheet_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * A refund (estorno) credited against a credit_expense. Models the Brazilian
 * case where some products of an installment purchase are refunded: the credit
 * lands on one or more invoices without altering the original purchase, so the
 * remaining products keep being billed. A single-month refund has
 * totalParcels = 1; an estorno parcelado spreads the credit across months
 * (referenceMonth → lastParcelMonth), mirroring credit_expenses' parcel model.
 *
 * Card and subcategory are NOT stored here — they are inherited from the
 * parent expense at query time, keeping single source of truth (arch §9.3).
 */
export const creditRefunds = pgTable("credit_refunds", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  creditExpenseId: uuid("credit_expense_id")
    .notNull()
    .references(() => creditExpenses.id, { onDelete: "cascade" }),
  description: text("description"),
  parcelValue: numeric("parcel_value", { precision: 12, scale: 2 }).notNull(),
  totalParcels: integer("total_parcels").notNull().default(1),
  // First invoice month the credit lands on (yyyy-mm-01).
  referenceMonth: date("reference_month").notNull(),
  // Derived: referenceMonth + (totalParcels - 1) months.
  lastParcelMonth: date("last_parcel_month"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cashExpenses = pgTable("cash_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "restrict" }),
  method: cashMethodEnum("method").notNull(),
  subcategoryId: uuid("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "restrict" }),
  date: date("date").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  /** When set, the expense was drawn from this liquid savings (cofrinho).
   *  Actions decrement the savings balance on insert and reverse on
   *  delete/update so the user only edits one place. */
  liquidSavingsId: uuid("liquid_savings_id"),
  originalSpreadsheetId: text("original_spreadsheet_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fixedExpenses = pgTable("fixed_expenses", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "restrict" }),
  subcategoryId: uuid("subcategory_id")
    .notNull()
    .references(() => subcategories.id, { onDelete: "restrict" }),
  paymentMethod: paymentMethodEnum("payment_method").notNull(),
  monthlyAmount: numeric("monthly_amount", { precision: 12, scale: 2 }).notNull(),
  dueDay: integer("due_day"),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const incomes = pgTable("incomes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  type: incomeTypeEnum("type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  date: date("date").notNull(),
  originalSpreadsheetId: text("original_spreadsheet_id"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const cashReceivables = pgTable("cash_receivables", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  loanType: loanTypeEnum("loan_type").notNull(),
  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  loanDate: date("loan_date").notNull(),
  expectedPaymentMonth: date("expected_payment_month").notNull(),
  isPaid: boolean("is_paid").notNull().default(false),
  actualPaymentDate: date("actual_payment_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const creditReceivables = pgTable("credit_receivables", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  description: text("description").notNull(),
  cardId: uuid("card_id")
    .notNull()
    .references(() => cards.id, { onDelete: "restrict" }),
  purchaseDate: date("purchase_date").notNull(),
  totalParcels: integer("total_parcels").notNull(),
  parcelValue: numeric("parcel_value", { precision: 12, scale: 2 }).notNull(),
  firstParcelDate: date("first_parcel_date"),
  lastParcelDate: date("last_parcel_date"),
  firstParcelMonth: date("first_parcel_month"),
  lastParcelMonth: date("last_parcel_month"),
  manualOverride: boolean("manual_override").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Tracks which individual parcels of a credit receivable have been received.
 * One row = one paid parcel. Absent row = unpaid. Cascades on parent delete.
 */
export const creditReceivableParcelsPaid = pgTable(
  "credit_receivable_parcels_paid",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    receivableId: uuid("receivable_id")
      .notNull()
      .references(() => creditReceivables.id, { onDelete: "cascade" }),
    parcelNumber: integer("parcel_number").notNull(),
    paidAt: timestamp("paid_at").notNull().defaultNow(),
  },
  (t) => ({
    uniqueParcel: unique().on(t.receivableId, t.parcelNumber),
  }),
);

export const liquidSavings = pgTable("liquid_savings", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  bank: text("bank").notNull(),
  applicationDate: date("application_date").notNull(),
  appliedAmount: numeric("applied_amount", { precision: 12, scale: 2 }).notNull(),
  latestYield: numeric("latest_yield", { precision: 12, scale: 2 }).notNull().default("0"),
  lastUpdateDate: date("last_update_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fixedIncome = pgTable("fixed_income", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  title: text("title").notNull(),
  bank: text("bank").notNull(),
  applicationDate: date("application_date").notNull(),
  maturityDate: date("maturity_date").notNull(),
  appliedAmount: numeric("applied_amount", { precision: 12, scale: 2 }).notNull(),
  latestYield: numeric("latest_yield", { precision: 12, scale: 2 }).notNull().default("0"),
  lastUpdateDate: date("last_update_date"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * Per-day balance snapshots for either a liquid_savings or fixed_income
 * row. The `current_value` is what the user observed in their bank app
 * on `recorded_on`; combined with `applied_amount` from the parent we
 * can reconstruct the real gain over time. Polymorphic on
 * (investment_kind, investment_id).
 */
export const investmentUpdates = pgTable(
  "investment_updates",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    investmentKind: investmentKindEnum("investment_kind").notNull(),
    investmentId: uuid("investment_id").notNull(),
    recordedOn: date("recorded_on").notNull(),
    currentValue: numeric("current_value", { precision: 12, scale: 2 }).notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("investment_updates_one_per_day").on(t.investmentKind, t.investmentId, t.recordedOn),
  ],
);

export const monthlySnapshots = pgTable(
  "monthly_snapshots",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    monthLabel: text("month_label").notNull(),
    referenceMonth: date("reference_month").notNull(),
    totalIncomes: numeric("total_incomes", { precision: 12, scale: 2 }).notNull(),
    totalExpenses: numeric("total_expenses", { precision: 12, scale: 2 }).notNull(),
    totalSave: numeric("total_save", { precision: 12, scale: 2 }).notNull(),
    totalLiquidSavings: numeric("total_liquid_savings", { precision: 12, scale: 2 }).notNull(),
    totalFixedIncome: numeric("total_fixed_income", { precision: 12, scale: 2 }).notNull(),
    status: snapshotStatusEnum("status").notNull().default("locked"),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
  },
  (t) => [unique("monthly_snapshots_user_month_unique").on(t.userId, t.referenceMonth)],
);

// ---------------------------------------------------------------------------
// Habit tracking — unlocks ADR-009 (deferred). Sister domain to finance,
// reuses auth and design system but lives on its own tables. The first
// non-financial domain in the app, intentionally kept narrow:
//   - Boolean only: a log row exists for a (habit, date) iff the user
//     succeeded that day. For "do" habits success = "did the thing".
//     For "avoid" habits success = "stayed clean".
//   - Two schedules: daily, or N times/week with no fixed days.
// ---------------------------------------------------------------------------

export const habitCategories = pgTable("habit_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#7e82aa"),
  icon: text("icon"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const habits = pgTable("habits", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  categoryId: uuid("category_id").references(() => habitCategories.id, {
    onDelete: "set null",
  }),
  polarity: habitPolarityEnum("polarity").notNull().default("do"),
  schedule: habitScheduleEnum("schedule").notNull().default("daily"),
  /** Only used when schedule = 'weekly_target'. Null otherwise. */
  targetPerWeek: integer("target_per_week"),
  color: text("color").notNull().default("#7e82aa"),
  icon: text("icon"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/**
 * OAuth 2.0 tokens for Google Calendar integration. Single row per
 * user; rotated on refresh. Refresh token is nullable because Google
 * only returns it on first consent or when prompt=consent forces a
 * fresh handshake.
 */
export const googleCalendarTokens = pgTable("google_calendar_tokens", {
  userId: uuid("user_id").primaryKey(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token"),
  scope: text("scope").notNull(),
  tokenType: text("token_type").notNull().default("Bearer"),
  expiry: timestamp("expiry").notNull(),
  email: text("email"),
  connectedAt: timestamp("connected_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

/**
 * Per-user preferences (single row per user, PK is user_id). First
 * use: the home page cover image picked from Unsplash + the optional
 * quote shown alongside.
 */
export const userSettings = pgTable("user_settings", {
  userId: uuid("user_id").primaryKey(),
  homeCoverUrl: text("home_cover_url"),
  homeCoverThumbUrl: text("home_cover_thumb_url"),
  homeCoverAlt: text("home_cover_alt"),
  homeCoverPhotographerName: text("home_cover_photographer_name"),
  homeCoverPhotographerUrl: text("home_cover_photographer_url"),
  homeCoverUnsplashId: text("home_cover_unsplash_id"),
  homeQuote: text("home_quote"),
  homeQuoteAuthor: text("home_quote_author"),
  /** Canonical Spotify share URL (playlist/album/track). Embed URL is
   *  derived at render time from this. Null = no embed shown. */
  homeSpotifyUrl: text("home_spotify_url"),
  /** Active palette preset id. Maps to a bundle of CSS-variable overrides
   *  defined in `lib/theme/palettes.ts`. Default 'lunar' is the original
   *  moonbase palette. */
  palette: text("palette").notNull().default("lunar"),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const habitLogs = pgTable(
  "habit_logs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    habitId: uuid("habit_id")
      .notNull()
      .references(() => habits.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [unique("habit_logs_habit_date_unique").on(t.habitId, t.date)],
);

/* ─── journal ───────────────────────────────────────────────────────── */

/**
 * One reflection per user per day. The end-of-day model: title-less
 * entries indexed by `entry_date`. Both `mood` (numeric 1–5 climatic
 * scale, nullable) and `content` (markdown, nullable) are optional —
 * the user can save just a mood, just text, or both, or even just a
 * cover image. The cover columns mirror `user_settings.home_cover_*`
 * — same Unsplash metadata, scoped per entry instead of per user.
 */
export const journalEntries = pgTable(
  "journal_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    entryDate: date("entry_date").notNull(),
    /** Climatic 1–5 scale: 1 = pesado, 5 = radiante. Null = no mood logged. */
    mood: smallint("mood"),
    /** List of gratitude items captured for the day. Null/empty array
     *  when the user skipped the gratitude prompt. */
    gratitude: text("gratitude").array(),
    /** Short title / descriptor for the day (e.g. "04 de maio, ameno"). Null when omitted. */
    title: text("title"),
    /** Markdown body. Null when the user only logged a mood/cover. */
    content: text("content"),
    coverUrl: text("cover_url"),
    coverThumbUrl: text("cover_thumb_url"),
    coverAlt: text("cover_alt"),
    coverPhotographerName: text("cover_photographer_name"),
    coverPhotographerUrl: text("cover_photographer_url"),
    coverUnsplashId: text("cover_unsplash_id"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("journal_entries_user_date_unique").on(t.userId, t.entryDate)],
);

/**
 * Quotes / reflections collected through the day. Independent of
 * journal_entries — captured ad hoc, attributed to a date. May or may
 * not have an author or source attached.
 */
export const journalQuotes = pgTable("journal_quotes", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  text: text("text").notNull(),
  author: text("author"),
  source: text("source"),
  collectedOn: date("collected_on").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

/* ─── monthly budgets (spending goals) ─────────────────────────────── */

/**
 * Optional spending caps per month. One row per (user, month). All
 * limit columns are nullable — the user sets only the goals they care about.
 */
export const monthlyBudgets = pgTable(
  "monthly_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    /** First day of the month, yyyy-mm-01. */
    referenceMonth: date("reference_month").notNull(),
    maxCredit: numeric("max_credit", { precision: 12, scale: 2 }),
    maxCash: numeric("max_cash", { precision: 12, scale: 2 }),
    maxTotal: numeric("max_total", { precision: 12, scale: 2 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [unique("monthly_budgets_user_month_unique").on(t.userId, t.referenceMonth)],
);

/**
 * Per-category spending cap for a given month. One row per
 * (user, month, category). Cascades on category delete.
 */
export const monthlyCategoryBudgets = pgTable(
  "monthly_category_budgets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").notNull(),
    referenceMonth: date("reference_month").notNull(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    maxAmount: numeric("max_amount", { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("monthly_category_budgets_user_month_cat_unique").on(
      t.userId,
      t.referenceMonth,
      t.categoryId,
    ),
  ],
);

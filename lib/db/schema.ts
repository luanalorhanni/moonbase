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

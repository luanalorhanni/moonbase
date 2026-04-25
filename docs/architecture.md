# 🌙 moonbase — Architecture Document

> Architecture document for **moonbase**, a personal finance management system built from scratch by Luana Lorhanni. The name evokes a personal command center: a self-sufficient base from which the user operates, plans, and controls their financial life. Like a lunar outpost, it is built foundation by foundation — schema, ADRs, phases — and grows incrementally without losing coherence.
>
> This document is the source of truth for design decisions, technical stack, domain model, conventions, and migration plan. It is also the primary input for AI-assisted development (e.g., Claude Code) and should be referenced before any implementation work.

**Project name:** moonbase
**Version:** 1.1 (named, with visual identity guidance)
**Date:** 2026-04-25
**Status:** Active — implementation phase about to begin
**Language:** Portuguese (Brazil) for context, English for code and identifiers

---

## 1. Executive Summary

**moonbase** is a **single-user personal finance web application** that replaces both a Google Sheets spreadsheet (in use since July 2024) and an experimental Notion implementation that was abandoned in April 2026. The system manages credit and cash expenses, fixed monthly recurring expenses, incomes, receivables (single-payment and installment-based), investments (variable and fixed income), and produces consolidated monthly and annual reporting.

The name **moonbase** symbolizes a personal command center — a self-sufficient outpost from which the user operates and controls their financial life. The metaphor pairs naturally with the system's design philosophy: built foundation by foundation, modular, autonomous, with clear boundaries between data, logic, and presentation. The lunar imagery also resonates with monthly cycles, which are the fundamental unit of time in finance.

The system is built as a **modern monolithic Next.js application** with TypeScript, deployed to Vercel, using Supabase for PostgreSQL database and authentication. UI uses shadcn/ui components with Tailwind CSS, following a visual identity inspired by lunar/space aesthetics (see section 7). The primary interface is a responsive web app that also functions as a Progressive Web App (PWA) for mobile use.

The project is a personal hobby with no deadline, built in short sessions distributed over weeks or months. The developer is experienced in Next.js/React/TypeScript, which informs decisions toward idiomatic and modern patterns rather than conservative or beginner-friendly choices.

---

## 2. Project History and Context

This section preserves the historical context that shaped current decisions. Future developers (including the user and AI assistants) should understand **why** we are here, not just **what** we are building. Each prior phase produced learnings that influence the current architecture.

### 2.1 Phase 0 — Google Sheets (Jul 2024 – Apr 2026)

The original system was a Google Sheets workbook with 9 interconnected tabs (`📅 Anual Finance`, `🗓️ Monthly Finance`, `🏦 Investiments`, `🪪 Credit Expenses`, `💵 Cash Expenses`, `📈 Incomes`, `🪙 Receivable`, `🛒 Carts`, `⚪ Categorys`). It included Apps Script automations and complex formulas with `INDIRECT()` to survive row insertions, plus a "snapshot history" pattern where past months were frozen as hardcoded values.

**Strengths**: free, accessible everywhere, mature data, working snapshot pattern.

**Limitations identified during use**:
- Formula complexity grew exponentially with each new feature
- Variable card closing days caused recurring errors that required manual hardcoded overrides (8 out of 124 credit expense rows had hardcoded values bypassing formulas)
- No referential integrity (typing "nubank" vs "Nubank" silently broke lookups)
- Cross-sheet references were fragile and required `INDIRECT()` workarounds
- Limited visualization options
- FILTER formulas don't survive XLSX export (became `__xludf.DUMMYFUNCTION` cached values)

### 2.2 Phase 1 — Notion Experiment (Apr 2026)

Following the Sheets limitations, an experiment was conducted to migrate to Notion as a data hub with Python scripts running via GitHub Actions for derived fields. A complete database structure was built (13 related databases), tested with sample records, and then **the experiment was abandoned**.

**Why Notion failed for this use case**:
- Native Notion formulas could not express the multi-database lookups needed for variable card closing logic — required external code
- Charts limited to 1 per database on free plan
- API rate limit of 3 req/s, while acceptable, signaled Notion's intent for the API to be a secondary integration path, not a primary engine
- The split between "data lives in Notion" and "logic lives in Python" added a coordination layer with eventual consistency that felt brittle
- The interactive dashboard experience (forms, real-time calculations, monthly aggregated views) is not what Notion is best at — Notion is a documents-and-databases tool, not an applications platform
- Mobile experience for fast data entry was acceptable but not exceptional
- The fundamental conclusion: **using Notion as a database for an application means fighting against what Notion is designed to be**

**What we kept from the Notion experiment**:
- The domain model (entity definitions, relationships)
- The decision to model **card closings as a month-by-month table** with fallback to default closing day
- The decision to use **monthly snapshots** for historical immutability
- The decision to **derive fields via code** (first parcel, last parcel) rather than spreadsheet formulas
- The naming conventions adopted: lowercase English for system-level identifiers, original capitalization for user content (e.g., proper names like "Nubank", "Banco do Brasil", "Mercado Pago" stay capitalized; system labels like "credit", "pix", "salary" are lowercase)

### 2.3 Phase 2 — Bespoke System (current)

The decision was made to **build a from-scratch web application** rather than rely on a SaaS data platform. The chosen architecture is a Next.js 15 monolith with Supabase as the data layer. Rationale:

- **The use case is an application, not a knowledge base** — it benefits from custom UI, calculated fields, dashboards, forms, and PWA installation on mobile
- **Single-user scope** simplifies authentication, authorization, and infrastructure concerns
- **Modern Next.js** (App Router, Server Components, Server Actions) makes building such a system productive without splitting into multiple repositories or services
- **Supabase free tier** covers personal use indefinitely (database, auth, storage, edge functions)
- **TypeScript end-to-end** provides safety from database schema to UI components

---

## 3. Technical Stack

This section enumerates the chosen technologies. All decisions are documented in ADRs (section 4) and should be revisited only by writing a new ADR that supersedes the existing one. AI assistants implementing code must use these technologies and patterns by default; deviations require explicit justification.

### 3.1 Core Stack

| Layer | Technology | Version Target | Notes |
|-------|------------|----------------|-------|
| Framework | Next.js | 15+ (App Router) | Server Components, Server Actions, Route Handlers |
| Language | TypeScript | 5.5+ | Strict mode enabled |
| Runtime | Node.js | 22+ LTS | |
| Database | PostgreSQL via Supabase | 16+ | Hosted at Supabase free tier |
| ORM | Drizzle ORM | latest | TypeScript-first, lightweight, SQL-like |
| Auth | Supabase Auth | included | Email + magic link sufficient for single user |
| UI Components | shadcn/ui | copy-in latest | New York variant, Radix primitives |
| Styling | Tailwind CSS | 4+ | |
| Forms | React Hook Form + Zod | latest | Type-safe forms with schema validation |
| Charts | Recharts | latest | Reasonable balance of flexibility and simplicity |
| Date handling | date-fns | latest | Lightweight, tree-shakeable |
| Icons | lucide-react | latest | Default for shadcn/ui |
| Testing (unit) | Vitest | latest | Fast, native ESM |
| Testing (E2E) | Playwright | latest | Add when stable user flows exist (post-MVP) |
| Linting | ESLint + Prettier | latest | Default Next.js config |
| Package manager | pnpm | latest | |

### 3.2 Hosting and Infrastructure

| Component | Service | Plan |
|-----------|---------|------|
| Web app | Vercel | Hobby (free) |
| Database | Supabase | Free tier |
| Auth | Supabase Auth | Free tier |
| File storage | Supabase Storage | Free tier (only if needed for receipts) |
| Domain | Vercel default subdomain initially | Custom domain optional |
| Monitoring | Vercel Analytics | Free tier |

### 3.3 PWA

The application must be installable as a Progressive Web App on mobile devices from the first deployment. This is a hard requirement, not a stretch goal.

- Manifest with icons, theme color, display mode `standalone`
- Service worker for offline capability of read-only views (using `next-pwa` or built-in Next.js patterns)
- Responsive design that prioritizes mobile-first for entry forms, desktop for analytical views

### 3.4 Forbidden / Out of Scope

To prevent scope creep and keep the system focused, the following are **out of scope** for the initial implementation:

- Multi-user features (sharing, permissions, collaboration)
- Native mobile apps (React Native / Expo) — PWA is sufficient
- Real-time multi-device sync via WebSockets (not needed for single user)
- Open Finance integrations (manual entry is the chosen primary input method)
- Habit tracking (this is a future, separate domain — see ADR-009)
- Multiple currencies (BRL only)
- Cryptocurrency tracking
- Stock portfolio tracking with ticker prices

---

## 4. Architecture Decision Records (ADRs)

Each important decision is recorded as an ADR with the following structure: status, context, options considered, decision, and consequences. ADRs are immutable historical records — when superseded, they are marked `Superseded by ADR-XXX` rather than deleted.

### ADR-001: Build a bespoke web application instead of using a SaaS data platform

**Status:** Accepted.

**Context.** After abandoning Google Sheets due to formula complexity and abandoning Notion due to its mismatch with application use cases, the user evaluated whether to use another data platform (Airtable, Coda, Baserow) or build from scratch. The user is experienced with Next.js/React/TypeScript and explicitly seeks a system tailored to specific financial needs.

**Options considered.**
- Continue with a SaaS platform (Airtable/Coda/Baserow) — same fundamental mismatch as Notion, just different vendor lock-in
- Build a bespoke web application — full control, custom UI, designed for the specific use case
- Use an existing personal finance app (Mobills, Organizze, YNAB) — abandons modeling flexibility, vendor lock-in, may not support specific Brazilian use cases

**Decision.** Build a bespoke web application using Next.js + Supabase.

**Consequences.** Total control over UI, data model, and behavior. Higher initial implementation cost (estimated 40-80 hours over weeks). No vendor lock-in beyond infrastructure (Vercel, Supabase) which is replaceable. The user must commit to maintaining the application long-term — bug fixes, dependency updates, and feature additions are all the user's responsibility.

### ADR-002: Next.js monolith over separated frontend/backend

**Status:** Accepted.

**Context.** When building a web application, a key decision is whether to use a single-repository full-stack framework (Next.js, Remix, SvelteKit) or split into a separate API backend (FastAPI, Express, Hono) and frontend SPA. The project is single-developer and single-user.

**Options considered.**
- Next.js monolith — single repo, single deployment, server actions for mutations, RSC for data fetching
- Next.js frontend + separate API (Hono/Express) — clean separation, more deploy targets, but two services to maintain
- Frontend SPA (Vite + React) + separate API — even more separation, irrelevant for single-user

**Decision.** Next.js 15 monolith with App Router, Server Components, and Server Actions.

**Consequences.** Single repository, single deploy pipeline, single mental model. Server Actions provide a clean way to write mutations without REST/GraphQL boilerplate. No artificial network boundary between data layer and UI. If a third-party integration ever needs an HTTP API, Route Handlers in `app/api/*` can be added incrementally.

### ADR-003: Supabase for database, auth, and infrastructure

**Status:** Accepted.

**Context.** The application needs a PostgreSQL database, authentication (even for a single user, basic auth is required to keep the app private), and ideally minimal infrastructure management for a hobby project.

**Options considered.**
- Self-hosted Postgres + custom auth — most control, most maintenance overhead
- Vercel Postgres + Clerk/Auth.js — viable, but two separate services
- Supabase (Postgres + Auth + Storage + Edge Functions) — consolidated platform with a single provider
- Neon + Auth.js — modern Postgres serverless + flexible auth, but two services

**Decision.** Supabase for Postgres, authentication, and (optionally) storage.

**Consequences.** Free tier covers personal use for the foreseeable future (500MB database, 1GB storage, 2GB bandwidth, 50k MAU). Single dashboard for monitoring database, auth, and logs. Native Row Level Security (RLS) provides defense in depth even for a single-user app. Migration to self-hosted or another provider later is feasible because Drizzle ORM abstracts SQL and Supabase Auth uses standard JWTs.

### ADR-004: Drizzle ORM over Prisma

**Status:** Accepted.

**Context.** TypeScript-first ORMs in 2026 include Prisma (mature, popular, code-gen heavy) and Drizzle (newer, lightweight, SQL-close). For a personal project where the developer is comfortable with SQL, the trade-offs differ.

**Options considered.**
- **Prisma** — most popular, excellent docs, requires generation step, runs as a separate query engine, slower cold starts on serverless
- **Drizzle** — TypeScript-first, no generation step, runs in any JS environment, SQL-close syntax, lighter
- **Raw SQL with `postgres` package** — maximum control, more boilerplate, manual type safety

**Decision.** Drizzle ORM.

**Consequences.** Schema defined in TypeScript files (`db/schema.ts`), migrations generated and applied via `drizzle-kit`. No separate query engine — runs natively in Vercel serverless functions with low cold-start cost. SQL-close syntax means SQL knowledge transfers directly. If Drizzle ever falls short, raw SQL queries can be embedded via `sql\`\`` template literal.

### ADR-005: Snapshot history pattern preserved from Sheets/Notion

**Status:** Accepted.

**Context.** The original Sheets system has a pattern where past months are "frozen" as hardcoded values to prevent retroactive recalculation. This pattern was preserved in the Notion experiment as a `Monthly Snapshots` database. The decision is whether to maintain this pattern in the new system.

**Options considered.**
- Always recompute on demand — simplest, but past totals can change if old expenses are edited
- Snapshot pattern with explicit `monthly_snapshots` table — historical stability, explicit immutability
- Hybrid (compute by default, allow seal) — flexible but adds UI complexity

**Decision.** Snapshot pattern. A `monthly_snapshots` table stores consolidated monthly totals. Records are created by a background job (Vercel Cron or manual trigger) at month end. Snapshots are immutable by default; manual recalculation is possible via an explicit admin action with confirmation.

**Consequences.** Historical reports never change retroactively. The snapshot generation logic must be implemented and tested carefully. The UI must clearly indicate whether displayed values come from a snapshot (locked) or a live calculation (current month).

### ADR-006: Variable card closing day modeled as `card_closings` table

**Status:** Accepted.

**Context.** Brazilian credit cards have closing days that vary month to month due to weekends, holidays, and bank policies. The Sheets system used a fixed closing day per card, which caused 8 manual overrides in 124 expenses (6.5%). The Notion experiment introduced a `card_closings` database to record actual closing days per card per month, with fallback to the card's default closing day when a month has no record. This pattern proved sound in principle and is preserved.

**Options considered.**
- Fixed closing day per card with manual overrides per expense — current Sheets behavior, doesn't scale
- Per-expense override field — requires the user to remember when their estimate was wrong
- Per-card per-month closing day table — clean separation, single source of truth for the rule

**Decision.** A `card_closings` table with `(card_id, reference_month, closing_day)` records. The `calculate_first_parcel_month(card_id, purchase_date)` function looks up the closing day in this table first, falling back to `cards.default_closing_day`. Updates to `card_closings` trigger recalculation of derived fields on affected credit expenses.

**Consequences.** A new database table with maintenance overhead — the user updates it when checking their bank app. A function in `lib/finance/parcels.ts` encapsulates the rule and is the single point of change for the parcel calculation logic. Recalculation triggers can be implemented as Server Actions invoked manually, or as background jobs.

### ADR-007: Server Actions for mutations, RSC for reads

**Status:** Accepted.

**Context.** Next.js 15 with App Router supports Server Actions (`"use server"` functions called from client components) and React Server Components (RSC) for server-side data fetching. The decision is whether to use these patterns universally or fall back to traditional API routes.

**Options considered.**
- Pure Server Actions + RSC — modern Next.js style, no REST boilerplate
- Server Actions + RSC + selective Route Handlers for cases that benefit from HTTP semantics (webhooks, third-party callbacks)
- Traditional API routes everywhere — more boilerplate, no benefit for single-user app

**Decision.** Server Actions for all mutations, RSC for all reads. Route Handlers only when an external HTTP endpoint is required (e.g., a future Vercel Cron handler).

**Consequences.** Simpler codebase. Forms call Server Actions directly with `useFormState`/`useTransition` patterns. Reads happen in async server components with direct database access. Optimistic updates handled at the React level. No need to design REST routes for internal mutations.

### ADR-008: Row Level Security on Supabase even for single-user app

**Status:** Accepted.

**Context.** Supabase provides Row Level Security (RLS) on Postgres tables. For a single-user app, RLS adds a defensive layer that prevents accidental data exposure if anonymous keys leak.

**Options considered.**
- No RLS, relying on application-level authorization
- RLS on all tables, requiring authenticated `user_id` for all queries
- RLS only on sensitive tables

**Decision.** RLS enabled on all tables. All tables have a `user_id uuid not null references auth.users(id)` column. Default policy: only allow reads/writes where `auth.uid() = user_id`.

**Consequences.** Slight schema overhead (every table has `user_id`). Defense in depth — even if app code has a bug or anonymous keys leak, the database refuses unauthorized access. Future-proofs the schema if multi-user features are ever added (out of scope for now per section 3.4, but the schema would already be ready).

### ADR-009 (deferred): Habit tracking domain

**Status:** Deferred.

**Context.** The original conversation included an aspirational scope expansion to habit tracking. This is explicitly deferred until the financial system is operational and proven.

**Deferred decision.** A separate domain folder (`lib/habits/*`, `app/(habits)/*`) with its own database tables would be added later. The shared infrastructure (auth, layout, navigation, design system) would be reused. No design work happens until the user explicitly resumes this discussion.

### ADR-010 (deferred): Receipt attachment storage

**Status:** Deferred.

**Context.** Optionally, expense records could have attached receipts (photos or PDFs). Supabase Storage supports this in the free tier (up to 1GB). Whether to implement this in MVP is the question.

**Deferred decision.** Out of scope for MVP. Will be evaluated after the system has been used for a few months to determine if the absence of receipts is felt.

---

## 5. Domain Model

This section defines the entities, their attributes, and their relationships. The schema is presented as Drizzle TypeScript definitions paired with explanatory text. Naming follows the conventions established in section 6: snake_case for database columns and tables, camelCase for TypeScript identifiers, lowercase English for system labels, original capitalization preserved for user-entered content.

### 5.1 Domain Overview Diagram

```
┌─────────────┐         ┌─────────────────┐         ┌──────────────┐
│  categories │◄────────│  subcategories  │◄────────│   expenses   │
└─────────────┘         └─────────────────┘         │   (parent)   │
                                                    └──────┬───────┘
                                                           │
                                              ┌────────────┼────────────┐
                                              │            │            │
                                       ┌──────▼────┐ ┌────▼───────┐ ┌──▼──────┐
                                       │  credit   │ │   cash     │ │  fixed  │
                                       │ expenses  │ │  expenses  │ │expenses │
                                       └──────┬────┘ └────┬───────┘ └────┬────┘
                                              │           │              │
                                              └───────────┼──────────────┘
                                                          │
                                                          ▼
                                                   ┌─────────────┐
                                                   │    cards    │
                                                   └──────┬──────┘
                                                          │
                                                          ▼
                                                   ┌──────────────┐
                                                   │card_closings │
                                                   └──────────────┘

┌──────────┐      ┌───────────────────┐      ┌──────────────────┐
│ incomes  │      │ cash_receivables  │      │credit_receivables│
└──────────┘      └───────────────────┘      └──────────────────┘
                                                        │
                                                        ▼
                                                  ┌─────────┐
                                                  │  cards  │
                                                  └─────────┘

┌─────────────────┐      ┌──────────────┐      ┌──────────────────┐
│ liquid_savings  │      │ fixed_income │      │monthly_snapshots │
└─────────────────┘      └──────────────┘      └──────────────────┘
```

### 5.2 Entity Definitions

The following entities are the system's core. Each section describes the entity's purpose, key attributes, relationships, and notable invariants.

#### 5.2.1 `cards`

Represents payment methods: credit cards (with closing/due dates and limits) and accounts (banks for Pix, debit, cash).

Key attributes: `name` (display, original capitalization), `type` (`credit` | `account`), `bank`, `default_closing_day`, `due_day`, `limit_amount`, `color`, `is_active`.

Invariants: credit cards must have `default_closing_day`, `due_day`, and `limit_amount`. Accounts may have all three null.

Relationships: referenced by `credit_expenses`, `cash_expenses`, `fixed_expenses`, `credit_receivables`, `card_closings`.

#### 5.2.2 `categories` and `subcategories`

Hierarchical classification of expenses. `categories` are root-level (e.g., "Health", "Transport", "Restaurant"); `subcategories` belong to one category (e.g., "Hygiene" under "Health").

Key attributes (categories): `name`, `color`, `icon` (emoji).
Key attributes (subcategories): `name`, `category_id`.

Invariants: every subcategory must have a category. Categories and subcategories are not user-deletable if they are referenced by any expense; soft delete only.

#### 5.2.3 `card_closings`

Records the actual closing day of a specific credit card in a specific month. Used by the parcel calculation logic.

Key attributes: `card_id`, `reference_month` (date, always day 1), `closing_day` (integer 1-31).

Invariants: unique on `(card_id, reference_month)`. `closing_day` between 1 and 31.

Relationships: belongs to `cards`.

#### 5.2.4 `credit_expenses`

Credit card expenses, possibly installment-based. Has both user-entered fields and derived fields.

Key user attributes: `description`, `card_id`, `subcategory_id`, `purchase_date`, `total_parcels`, `parcel_value`, `manual_override` (boolean, defaults false).

Key derived attributes: `first_parcel_date` (date), `last_parcel_date` (date), `first_parcel_month` (date, day 1), `last_parcel_month` (date, day 1), `total_value` (computed via Drizzle generated column or application logic).

Invariants: `total_parcels >= 1`. `parcel_value > 0`. Derived fields are calculated by `lib/finance/parcels.ts` based on `purchase_date`, `card_id`, and the `card_closings` table. When `manual_override = true`, recalculation respects existing values rather than overwriting them.

Relationships: belongs to `cards`, `subcategories`.

#### 5.2.5 `cash_expenses`

Immediate-payment expenses (Pix, debit, cash). No parcels.

Key attributes: `description`, `card_id` (source account), `method` (`pix` | `debit` | `cash`), `subcategory_id`, `date`, `amount`.

Reference month is derived from `date` (just the year-month component).

Relationships: belongs to `cards`, `subcategories`.

#### 5.2.6 `fixed_expenses`

Recurring monthly expenses with stable value (subscriptions, gym, MEI tax, phone bill).

Key attributes: `description`, `card_id`, `subcategory_id`, `payment_method` (`credit` | `cash`), `monthly_amount`, `due_day`, `start_date`, `end_date` (nullable, null = still active), `is_active`.

These do not generate `cash_expenses` or `credit_expenses` records automatically — they are aggregated separately in monthly views and snapshots.

Relationships: belongs to `cards`, `subcategories`.

#### 5.2.7 `incomes`

Money received: salary, research grants, refunds, fees, sales.

Key attributes: `description`, `type` (`salary` | `research_grant` | `refund` | `fee` | `sale` | `other`), `amount`, `date`.

Reference month is derived from `date`.

#### 5.2.8 `cash_receivables`

Single-payment loans the user has the right to receive from someone else.

Key attributes: `description`, `loan_type` (`pix` | `debit` | `cash`), `amount`, `loan_date`, `expected_payment_month`, `is_paid`, `actual_payment_date`.

Invariants: `actual_payment_date` is set if and only if `is_paid = true`.

#### 5.2.9 `credit_receivables`

Installment receivables — typically purchases made on the user's card on behalf of someone else who pays back in installments. Mirrors `credit_expenses` structure.

Key user attributes: `description`, `card_id`, `purchase_date`, `total_parcels`, `parcel_value`, `manual_override`.

Key derived attributes: `first_parcel_date`, `last_parcel_date`, `first_parcel_month`, `last_parcel_month`, `total_value`. Calculated by the same `lib/finance/parcels.ts` logic as `credit_expenses`.

Relationships: belongs to `cards`.

#### 5.2.10 `liquid_savings`

Investments with instant liquidity and variable yield (commonly called "cofrinhos" in Brazilian banking apps).

Key attributes: `title`, `bank`, `application_date`, `applied_amount`, `latest_yield`, `last_update_date`, `is_active`.

Yield and update date are manually entered by the user when checking their bank app (no Open Finance integration in MVP).

#### 5.2.11 `fixed_income`

Investments with maturity and predictable yield (LCI, LCA, CDB, Treasury bonds).

Key attributes: `title`, `bank`, `application_date`, `maturity_date`, `applied_amount`, `latest_yield`, `last_update_date`, `is_active`.

#### 5.2.12 `monthly_snapshots`

Per ADR-005, immutable monthly snapshots of consolidated totals.

Key attributes: `month_label` (e.g., "april 2026"), `reference_month`, `total_incomes`, `total_expenses`, `balance` (computed: incomes − expenses), `total_save` (cumulative balance up to end of this month), `total_liquid_savings`, `total_fixed_income`, `generated_at`, `status` (`locked` | `draft`).

Created by `app/api/cron/monthly-snapshot/route.ts` on the 1st of each month, or manually via admin action.

### 5.3 SQL Schema (Drizzle)

The schema is implemented in `db/schema.ts` using Drizzle's TypeScript schema definitions. Below is the canonical reference. AI assistants must use this exact structure when scaffolding the schema.

```typescript
// db/schema.ts (canonical reference — implementation lives at this path)
import { pgTable, uuid, text, integer, numeric, date, timestamp, boolean, pgEnum, unique } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Enums
export const cardTypeEnum = pgEnum('card_type', ['credit', 'account']);
export const cashMethodEnum = pgEnum('cash_method', ['pix', 'debit', 'cash']);
export const paymentMethodEnum = pgEnum('payment_method', ['cash', 'credit']);
export const incomeTypeEnum = pgEnum('income_type', ['salary', 'research_grant', 'refund', 'fee', 'sale', 'other']);
export const loanTypeEnum = pgEnum('loan_type', ['pix', 'debit', 'cash']);
export const snapshotStatusEnum = pgEnum('snapshot_status', ['locked', 'draft']);
export const colorEnum = pgEnum('color', ['red', 'orange', 'yellow', 'green', 'blue', 'purple', 'pink', 'brown', 'gray']);

// Common: every table has user_id for RLS (ADR-008)

export const categories = pgTable('categories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  color: colorEnum('color').notNull().default('gray'),
  icon: text('icon'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const subcategories = pgTable('subcategories', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  categoryId: uuid('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cards = pgTable('cards', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  name: text('name').notNull(),
  type: cardTypeEnum('type').notNull(),
  bank: text('bank'),
  defaultClosingDay: integer('default_closing_day'),
  dueDay: integer('due_day'),
  limitAmount: numeric('limit_amount', { precision: 12, scale: 2 }),
  color: colorEnum('color').notNull().default('gray'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cardClosings = pgTable('card_closings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  referenceMonth: date('reference_month').notNull(), // always day 1
  closingDay: integer('closing_day').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  uniqueCardMonth: unique().on(t.cardId, t.referenceMonth),
}));

export const creditExpenses = pgTable('credit_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'restrict' }),
  subcategoryId: uuid('subcategory_id').notNull().references(() => subcategories.id, { onDelete: 'restrict' }),
  purchaseDate: date('purchase_date').notNull(),
  totalParcels: integer('total_parcels').notNull(),
  parcelValue: numeric('parcel_value', { precision: 12, scale: 2 }).notNull(),
  // derived fields:
  firstParcelDate: date('first_parcel_date'),
  lastParcelDate: date('last_parcel_date'),
  firstParcelMonth: date('first_parcel_month'),
  lastParcelMonth: date('last_parcel_month'),
  manualOverride: boolean('manual_override').notNull().default(false),
  originalSpreadsheetId: text('original_spreadsheet_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cashExpenses = pgTable('cash_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'restrict' }),
  method: cashMethodEnum('method').notNull(),
  subcategoryId: uuid('subcategory_id').notNull().references(() => subcategories.id, { onDelete: 'restrict' }),
  date: date('date').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  originalSpreadsheetId: text('original_spreadsheet_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fixedExpenses = pgTable('fixed_expenses', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'restrict' }),
  subcategoryId: uuid('subcategory_id').notNull().references(() => subcategories.id, { onDelete: 'restrict' }),
  paymentMethod: paymentMethodEnum('payment_method').notNull(),
  monthlyAmount: numeric('monthly_amount', { precision: 12, scale: 2 }).notNull(),
  dueDay: integer('due_day'),
  startDate: date('start_date').notNull(),
  endDate: date('end_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const incomes = pgTable('incomes', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  type: incomeTypeEnum('type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  date: date('date').notNull(),
  originalSpreadsheetId: text('original_spreadsheet_id'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const cashReceivables = pgTable('cash_receivables', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  loanType: loanTypeEnum('loan_type').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  loanDate: date('loan_date').notNull(),
  expectedPaymentMonth: date('expected_payment_month').notNull(),
  isPaid: boolean('is_paid').notNull().default(false),
  actualPaymentDate: date('actual_payment_date'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const creditReceivables = pgTable('credit_receivables', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  description: text('description').notNull(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'restrict' }),
  purchaseDate: date('purchase_date').notNull(),
  totalParcels: integer('total_parcels').notNull(),
  parcelValue: numeric('parcel_value', { precision: 12, scale: 2 }).notNull(),
  firstParcelDate: date('first_parcel_date'),
  lastParcelDate: date('last_parcel_date'),
  firstParcelMonth: date('first_parcel_month'),
  lastParcelMonth: date('last_parcel_month'),
  manualOverride: boolean('manual_override').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const liquidSavings = pgTable('liquid_savings', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  bank: text('bank').notNull(),
  applicationDate: date('application_date').notNull(),
  appliedAmount: numeric('applied_amount', { precision: 12, scale: 2 }).notNull(),
  latestYield: numeric('latest_yield', { precision: 12, scale: 2 }).notNull().default('0'),
  lastUpdateDate: date('last_update_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const fixedIncome = pgTable('fixed_income', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull(),
  bank: text('bank').notNull(),
  applicationDate: date('application_date').notNull(),
  maturityDate: date('maturity_date').notNull(),
  appliedAmount: numeric('applied_amount', { precision: 12, scale: 2 }).notNull(),
  latestYield: numeric('latest_yield', { precision: 12, scale: 2 }).notNull().default('0'),
  lastUpdateDate: date('last_update_date'),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const monthlySnapshots = pgTable('monthly_snapshots', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  monthLabel: text('month_label').notNull(),
  referenceMonth: date('reference_month').notNull(),
  totalIncomes: numeric('total_incomes', { precision: 12, scale: 2 }).notNull(),
  totalExpenses: numeric('total_expenses', { precision: 12, scale: 2 }).notNull(),
  totalSave: numeric('total_save', { precision: 12, scale: 2 }).notNull(),
  totalLiquidSavings: numeric('total_liquid_savings', { precision: 12, scale: 2 }).notNull(),
  totalFixedIncome: numeric('total_fixed_income', { precision: 12, scale: 2 }).notNull(),
  status: snapshotStatusEnum('status').notNull().default('locked'),
  generatedAt: timestamp('generated_at').notNull().defaultNow(),
}, (t) => ({
  uniqueUserMonth: unique().on(t.userId, t.referenceMonth),
}));
```

The corresponding RLS policies are added in a separate migration. A canonical RLS policy template:

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON table_name
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own data" ON table_name
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own data" ON table_name
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own data" ON table_name
  FOR DELETE USING (auth.uid() = user_id);
```

---

## 6. Code Conventions and Project Structure

This section is binding for all code in the repository. AI assistants must follow these conventions when generating code. Deviations require explicit justification in the PR description.

### 6.1 Project Structure

```
moonbase/
├── app/
│   ├── (auth)/                    # auth-related routes
│   │   ├── login/
│   │   └── callback/
│   ├── (dashboard)/               # protected routes (requires auth)
│   │   ├── layout.tsx             # main app layout with nav
│   │   ├── page.tsx               # home dashboard
│   │   ├── month/[reference]/     # monthly view (e.g., /month/2026-04)
│   │   ├── year/[year]/           # yearly view
│   │   ├── expenses/
│   │   │   ├── credit/
│   │   │   ├── cash/
│   │   │   └── fixed/
│   │   ├── incomes/
│   │   ├── receivables/
│   │   ├── investments/
│   │   ├── cards/
│   │   ├── categories/
│   │   └── snapshots/
│   ├── api/
│   │   └── cron/
│   │       └── monthly-snapshot/
│   ├── layout.tsx                 # root layout (PWA manifest link)
│   └── globals.css
├── components/
│   ├── ui/                        # shadcn/ui components (copied in)
│   ├── forms/                     # domain forms (CreditExpenseForm, etc.)
│   ├── tables/                    # data tables
│   ├── charts/                    # chart components
│   └── dashboard/                 # dashboard widgets
├── lib/
│   ├── db/
│   │   ├── index.ts               # Drizzle client
│   │   ├── schema.ts              # tables (canonical from section 5.3)
│   │   └── migrations/            # generated by drizzle-kit
│   ├── finance/                   # PURE business logic, no DB calls
│   │   ├── parcels.ts             # calculateFirstParcelMonth, etc.
│   │   ├── closings.ts            # getActualClosingDay
│   │   ├── snapshots.ts           # buildMonthlySnapshot
│   │   ├── projections.ts         # future balance projections
│   │   └── __tests__/             # Vitest unit tests
│   ├── actions/                   # Server Actions
│   │   ├── credit-expenses.ts
│   │   ├── cash-expenses.ts
│   │   └── ...
│   ├── queries/                   # database queries (used by RSCs)
│   │   ├── credit-expenses.ts
│   │   └── ...
│   ├── auth/                      # Supabase auth helpers
│   │   ├── client.ts
│   │   └── server.ts
│   ├── validation/                # Zod schemas for forms
│   │   ├── credit-expense.ts
│   │   └── ...
│   └── utils.ts                   # cn(), formatCurrency, formatDate
├── public/
│   ├── manifest.json
│   ├── icons/
│   └── favicon.ico
├── docs/
│   ├── architecture.md            # this file
│   └── adrs/                      # individual ADRs (extracted)
├── scripts/
│   ├── seed.ts                    # initial seed data
│   └── migrate-from-spreadsheet.ts # one-shot import
├── tests/
│   └── e2e/                       # Playwright tests (later)
├── .env.local.example
├── .env.local                     # gitignored
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── drizzle.config.ts
├── package.json
└── README.md
```

### 6.2 Coding Conventions

**Language and tone**:
- All code, comments, identifiers, commit messages, and PR descriptions in **English**
- User-facing UI text in **Portuguese (Brazil)**
- Documentation files in `/docs` follow the language of their context (e.g., this file is bilingual by design)

**Naming**:
- Files: `kebab-case.ts` for general files, `PascalCase.tsx` for React components, `route.ts`/`page.tsx`/`layout.tsx` for Next.js conventions
- Variables, functions: `camelCase`
- Types, components, classes: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Database columns and tables: `snake_case` (mapped to camelCase in TS via Drizzle)
- Enum values in DB: `lowercase_with_underscores`

**TypeScript**:
- Strict mode enabled
- No `any` (use `unknown` and narrow)
- Prefer `type` over `interface` unless extending classes
- Use Zod schemas as the source of truth for form validation; infer TS types from them

**React/Next.js**:
- Server Components by default; Client Components only when needed (interactivity, hooks)
- Mark Client Components explicitly with `"use client"` at top of file
- Server Actions in `lib/actions/*` with `"use server"` directive
- Forms: React Hook Form + Zod resolver
- Loading states: Suspense + `loading.tsx` files
- Error handling: error boundaries via `error.tsx` files

**Styling**:
- Tailwind utility classes
- shadcn/ui components for primitives (button, dialog, form, etc.)
- No CSS-in-JS libraries
- Mobile-first responsive design

**Database**:
- All queries through Drizzle, no raw SQL except for complex aggregations
- Every query filtered by `user_id` even though RLS enforces it (defense in depth)
- Migrations versioned in `lib/db/migrations/`, generated via `drizzle-kit generate`
- Migrations applied via `drizzle-kit migrate` against Supabase

**Pure logic**:
- Business logic in `lib/finance/*` is **pure** — no database calls, no I/O
- Functions take data as arguments and return computed results
- Each function in `lib/finance/` has unit tests in `__tests__/`
- Single source of truth for each rule (e.g., parcel calculation only lives in `lib/finance/parcels.ts`)

### 6.3 Data Handling

**Money**:
- Stored as `numeric(12, 2)` in PostgreSQL
- Represented as `string` in TypeScript (Drizzle's default for numeric) to avoid floating-point errors
- Use `Number(value)` only at the display boundary
- Format with `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`

**Dates**:
- Stored as `date` (not `timestamp`) when only the day matters
- Stored as `timestamp` only when the time component is meaningful
- Always treat dates as user's local date (no timezone math except where explicitly required)
- Format with `date-fns` and Portuguese locale

**Reference months**:
- Always represented as the first day of the month (`yyyy-mm-01`)
- This applies to `card_closings.reference_month`, `cash_receivables.expected_payment_month`, `monthly_snapshots.reference_month`, etc.

### 6.4 Git and PRs

**Branching**:
- `main` is always deployable
- Feature branches: `feature/short-description`
- Fix branches: `fix/short-description`
- Doc branches: `docs/short-description`

**Commit messages**:
- English, imperative present tense
- Examples: "Add card closing lookup with fallback", "Fix parcel calculation for end-of-month edge case"

**PRs**:
- Every change goes through a PR — no direct pushes to `main`, even solo
- PR description explains what and why
- CI must pass (Vitest + ESLint + TypeScript build) before merge
- Squash merge by default to keep `main` history clean

**Tags**:
- Semantic-ish tags for milestones: `v0.1-mvp`, `v0.2-pwa-installable`, etc.

### 6.5 Testing

**Unit tests (Vitest)**:
- Required for all functions in `lib/finance/*`
- Required for non-trivial validation logic in `lib/validation/*`
- Aim for behavior coverage, not line coverage

**E2E tests (Playwright)**:
- Add post-MVP, when stable user flows exist
- Cover the critical happy paths: create credit expense, create cash expense, view monthly summary

---

## 7. Visual Identity & UI Guidelines

This section defines the visual language of moonbase. It guides design decisions for the UI, ensuring consistency across screens and a coherent experience that matches the project's name and ethos. AI assistants implementing UI must follow these principles by default.

### 7.1 Identity Concept

**moonbase** is a personal command center. The visual identity should evoke:

- **Calm focus** — finance can be stressful; the UI should feel composed, not anxiety-inducing
- **Quiet authority** — the user is in control; the system supports rather than dominates
- **Lunar warmth** — the aesthetic references the moon and outer space, but never feels cold or sterile; warm neutrals and soft contrasts dominate
- **Personal scale** — single-user, intimate; not enterprise-y, not gamified, not over-designed

The opposite of moonbase, visually: a busy fintech dashboard with red/green PnL flashes, gamified streaks, dark mode "trader vibes". moonbase is closer to a beautifully designed reading app with a financial purpose.

### 7.2 Color Palette

The palette draws from **lunar regolith and quiet night skies**: warm off-whites, cool grays, deep blues, soft accent colors. The system supports both light and dark modes from day one (Tailwind's `dark:` variants + CSS variables).

#### Primary palette (light mode)

| Role | Value | Notes |
|------|-------|-------|
| `background` | `oklch(0.99 0.005 85)` | warm off-white, like aged paper or moonlight on stone |
| `foreground` | `oklch(0.18 0.01 280)` | deep blue-black, never pure black |
| `muted` | `oklch(0.96 0.005 85)` | subtle warm gray |
| `muted-foreground` | `oklch(0.45 0.01 280)` | medium blue-gray |
| `border` | `oklch(0.92 0.005 85)` | soft warm divider |
| `card` | `oklch(1 0 0)` | true white for elevation |

#### Primary palette (dark mode)

| Role | Value | Notes |
|------|-------|-------|
| `background` | `oklch(0.16 0.015 270)` | deep night sky, blue undertone |
| `foreground` | `oklch(0.95 0.005 85)` | warm off-white |
| `muted` | `oklch(0.22 0.015 270)` | slightly lighter night |
| `muted-foreground` | `oklch(0.65 0.01 280)` | medium gray-blue |
| `border` | `oklch(0.28 0.015 270)` | subtle separator |
| `card` | `oklch(0.20 0.015 270)` | elevated surface, very subtle |

#### Accent and semantic colors

| Role | Value | Use |
|------|-------|-----|
| `primary` | `oklch(0.55 0.15 260)` | actions, links, primary CTA — a lunar blue-purple |
| `accent` | `oklch(0.78 0.10 70)` | highlights, important values — warm amber, like moonlit gold |
| `success` | `oklch(0.65 0.15 150)` | positive balance, paid status — soft green |
| `warning` | `oklch(0.75 0.15 60)` | due soon, attention needed — warm amber-orange |
| `destructive` | `oklch(0.55 0.20 20)` | overdue, errors — desaturated red, never harsh |

These values are starting points and should be implemented as CSS variables in `app/globals.css` following the shadcn/ui convention. The exact values may be tuned during implementation; what matters is the **palette character** described above (warm neutrals, cool blue night, restrained accents).

### 7.3 Typography

**Primary typeface:** Geist Sans (Vercel's open-source font). Modern, technical, with subtle warmth. Excellent screen rendering. Works equally well in Portuguese and English.

**Monospace:** Geist Mono for numeric tables, codes, IDs.

**Fallback stack:** `Geist Sans, ui-sans-serif, system-ui, -apple-system, sans-serif`

**Type scale** (using Tailwind defaults extended where needed):

| Use | Class | Weight |
|-----|-------|--------|
| Page titles | `text-3xl tracking-tight` | 600 (semibold) |
| Section headers | `text-xl tracking-tight` | 600 |
| Card headers | `text-base` | 500 (medium) |
| Body | `text-sm` | 400 (regular) |
| Captions, meta | `text-xs` | 400 |
| Numeric values (large) | `text-2xl tabular-nums tracking-tight` | 500 |
| Numeric values (table) | `text-sm tabular-nums` | 400 |

Always use `tabular-nums` for monetary values and dates to ensure column alignment.

### 7.4 Iconography

Use **lucide-react** (default with shadcn/ui). It pairs well with Geist and provides a coherent set without custom artwork.

**Recommended icons by domain:**

| Domain | Icon |
|--------|------|
| Cards | `CreditCard`, `Wallet` |
| Categories | `Tag`, `Tags` |
| Credit expenses | `ReceiptText` |
| Cash expenses | `Banknote` |
| Fixed expenses | `Repeat` |
| Incomes | `TrendingUp`, `ArrowDownToLine` |
| Receivables | `HandCoins` |
| Liquid savings | `PiggyBank` |
| Fixed income | `Landmark` |
| Snapshots | `Camera`, `Archive` |
| Card closings | `CalendarClock` |
| Settings | `Settings2` |
| Brand mark | `Moon` (with custom variations possible) |

Avoid using more than 2-3 icons per screen to maintain visual calm.

### 7.5 Layout Principles

**Spacing.** Use Tailwind's spacing scale generously. Default to `gap-6` between major sections, `gap-4` between cards, `gap-2` within forms. White space is a feature, not a void.

**Containers.** Max width of `max-w-6xl` (1152px) for analytical pages. `max-w-2xl` (672px) for forms. `max-w-md` (448px) for auth screens. Center horizontally, never edge-to-edge on large screens.

**Cards.** Use shadcn/ui `Card` for grouping related content. Subtle borders (1px, `border` color) over heavy shadows. Shadows reserved for floating elements (dialogs, popovers).

**Hierarchy.** Use size and weight to establish hierarchy, not color. Color is for meaning (semantic), not for emphasis. A heading is bigger; an action is colored.

**Density.** Comfortable, not cramped. Tables use `py-3` per row minimum. Forms have generous label-input spacing.

**Mobile-first.** Every layout starts mobile and adds desktop affordances via responsive utilities. Touch targets ≥ 44px. Bottom navigation on mobile if appropriate.

### 7.6 Key UI Patterns

**Money display.** Always with currency symbol, always with thousand separators (Brazilian: `R$ 1.234,56`). Use `Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`. Color treatment: positive values in default `foreground` (not green), negative values in `destructive` (not red — soft destructive). Avoid the green/red PnL aesthetic; finance feels lighter when you don't constantly see warning colors.

**Dates.** Format with `date-fns` and Portuguese locale. Default format: `dd/MM/yyyy` for compact tables, `dd 'de' MMMM 'de' yyyy` for detail views, `MMMM yyyy` for month references. Always lowercase month names (per established naming convention).

**Tables.** Sortable columns with subtle indicators. Hover row highlight is `muted` background. Row selection uses left-side checkboxes. Empty state with icon + helpful text + primary action.

**Forms.** Single column on mobile, optional two-column on desktop for short forms. Labels above inputs (not floating). Inline validation on blur, not on every keystroke. Submit button at bottom, full-width on mobile, auto-width on desktop.

**Status indicators.** Use small colored dots or badges for state, not full-card colored backgrounds. A "paid" receivable shows a green dot + "pago" text, not a fully-green card.

**Charts.** Recharts with custom theme matching the palette. Avoid aggressive default colors. Single-color charts for simple trends, restrained color sets (3-5 hues) for category breakdowns.

**Empty states.** Every list view needs a thoughtful empty state: relevant icon, encouraging copy, primary action. Example for empty credit expenses: `Moon` icon (large, muted), text "Nenhuma despesa de crédito ainda. Que tal registrar a primeira?", button "Nova despesa".

### 7.7 Brand Mark and PWA

**Logo.** A simple **filled circle** representing the moon, with subtle gradient or shadow suggesting depth. Optionally, an arc of orbit around it. Word mark uses Geist Sans, lowercase, slightly tracked: `moonbase`.

**App icon (PWA).** The moon mark on a dark blue gradient background. Multiple sizes (192x192, 512x512, maskable). Generated and placed in `public/icons/`.

**Manifest.**
```json
{
  "name": "moonbase",
  "short_name": "moonbase",
  "description": "Personal finance command center",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#1a1d2e",
  "background_color": "#fafaf6",
  "icons": [/* see public/icons/ */]
}
```

**Theme color.** Dark mode primary (`#1a1d2e` approx) for browser chrome. Light background (`#fafaf6`) for splash screen.

### 7.8 Voice and Microcopy

**Tone.** Calm, supportive, plain. Never alarmist, never gamified, never overly cheerful. Microcopy in Portuguese (Brazil), avoiding excessive formality but maintaining respect.

**Examples:**

- Empty state: "Nenhuma despesa de crédito ainda." — neutral, not "Vish, tá tudo vazio aqui!"
- Confirmation: "Despesa registrada." — calm, not "Boa! Você arrasou!"
- Destructive action: "Tem certeza que deseja excluir esta despesa?" — direct, neutral
- Loading: "Carregando..." or skeleton — never "Aguente firme!"
- Errors: "Não foi possível salvar. Tente novamente." — apologetic, actionable

**Avoid:**
- Excessive emojis in UI (icons are enough)
- Marketing language ("Toma o controle das suas finanças!")
- Gamification ("Você está em uma sequência de 5 dias!")
- Anxiety-inducing alerts ("ATENÇÃO! Você gastou 80% do seu orçamento!")

The system informs and empowers; it does not manage emotions.

### 7.9 Accessibility Baseline

- WCAG AA contrast ratios for text (4.5:1 normal, 3:1 large)
- Keyboard navigation for all interactive elements
- ARIA labels on icon-only buttons
- Focus states clearly visible (default shadcn/ui styles are sufficient)
- Form errors announced by screen readers (React Hook Form + appropriate `aria-` attributes)
- Reduced motion respected (`prefers-reduced-motion`)

Single-user app does not lower the accessibility bar; future-you may have temporary impairments and will appreciate it.

---

## 8. Migration Plan

The migration from spreadsheet data to the new system happens in a single one-shot import, executed manually with supervision.

### 8.1 Migration Phases (Implementation Roadmap)

This roadmap describes the implementation order of the system itself, not just data migration. Each phase produces a deployable, working artifact.

#### Phase 0 — Repository setup (1 session)

**Done when:** GitHub repository created, Next.js app scaffolded, Tailwind configured, shadcn/ui initialized, Supabase project created, environment variables in `.env.local`, first deploy to Vercel succeeds with default homepage.

#### Phase 1 — Database schema (1-2 sessions)

**Done when:** `lib/db/schema.ts` mirrors section 5.3, migrations generated and applied to Supabase, RLS policies applied, Drizzle Studio confirms tables exist, basic CRUD test from a server action confirms reads/writes work.

#### Phase 2 — Authentication (1 session)

**Done when:** Login page (Supabase Auth, magic link or email+password) works, protected routes redirect unauthenticated users, current user available in server components and actions.

#### Phase 3 — Core domain logic (2-3 sessions)

**Done when:** `lib/finance/parcels.ts` and `lib/finance/closings.ts` implemented with full Vitest coverage. The functions are pure and don't touch the database. Edge cases are tested: purchases before/after/on closing day, with/without override in card_closings, multi-parcel calculations, end-of-month boundaries.

#### Phase 4 — CRUD UIs for primary entities (4-6 sessions)

**Done when:** Each primary entity (`cards`, `categories`, `subcategories`, `card_closings`, `credit_expenses`, `cash_expenses`, `fixed_expenses`, `incomes`, `cash_receivables`, `credit_receivables`, `liquid_savings`, `fixed_income`) has a list page, detail page, and create/edit form. Forms use React Hook Form + Zod. Server Actions persist via Drizzle. Derived fields on credit expenses are recomputed on save.

#### Phase 5 — Monthly view (2-3 sessions)

**Done when:** `/month/[reference]` page shows the consolidated view of a month — incomes, expenses by type, receivables, fixed expenses, with totals. Filters work. Charts (gastos por categoria, gastos por cartão) render via Recharts.

#### Phase 6 — Annual view and dashboards (2-3 sessions)

**Done when:** `/year/[year]` shows month-by-month evolution. Home dashboard `/` shows current month summary, recent activity, key metrics.

#### Phase 7 — PWA (1 session)

**Done when:** Manifest configured, service worker installed, icons present, app installable on iOS and Android, basic offline capability for cached read-only views.

#### Phase 8 — Spreadsheet migration script (2-3 sessions)

**Done when:** `scripts/migrate-from-spreadsheet.ts` reads the original `.xlsx` (using `xlsx` or `exceljs` library), normalizes data, handles edge cases (`__xludf.DUMMYFUNCTION` cached values, hardcoded month overrides, dates as Excel serial numbers), and inserts into Supabase via Drizzle. Dry-run mode logs what would be inserted. Real run requires `--confirm` flag. Historical snapshots are inserted into `monthly_snapshots` directly from the existing hardcoded values in `📅 Anual Finance`.

#### Phase 9 — Monthly snapshot cron (1 session)

**Done when:** `app/api/cron/monthly-snapshot/route.ts` builds the previous month's snapshot when invoked. Vercel Cron configured to call it on day 1 of each month at 03:00 UTC. Manual trigger button in `/snapshots` admin view.

#### Phase 10 — Polish and documentation (ongoing)

**Done when:** the user feels comfortable using the system as a daily driver and the spreadsheet has been retired. README is current, environment setup is documented, common operations (deploying a change, running migrations, accessing logs) are described.

### 8.2 Estimates

Total: **17-25 sessions** of varied length. Distributed over weeks or months at the user's pace. No deadline.

---

## 9. Principles and Conventions Recap

This section consolidates non-negotiable principles, repeating from earlier sections for emphasis and easy reference. AI assistants must internalize these:

1. **Every change goes through a PR.** Never commit to `main` directly.
2. **Pure logic stays pure.** Functions in `lib/finance/*` do not touch the database.
3. **Single source of truth.** Each rule lives in exactly one place.
4. **Type safety end-to-end.** From database schema to UI.
5. **Server Actions for mutations, RSC for reads.** Route Handlers only for external HTTP needs.
6. **RLS on every table.** Defense in depth.
7. **Money as `numeric(12,2)` strings, not floats.**
8. **Dates as `date` when time doesn't matter.**
9. **Mobile-first responsive design.** PWA from day 1.
10. **English for code, Portuguese for UI.**
11. **Tests required for `lib/finance/*`.** Not optional.
12. **Backups regularly.** Supabase has automated backups; supplement with monthly export.
13. **Migrations versioned in Git.** Never edit production schema directly.
14. **Drizzle Studio for inspection, not for writes.** Production writes only through migrations or app code.

---

## 10. Glossary

Project-specific terms in alphabetical order. Includes both technical and domain terms.

**ADR** — Architecture Decision Record. A structured document recording a single decision, its context, alternatives, and consequences. Used in section 4.

**App Router** — Next.js file-system-based router introduced in Next.js 13. Used throughout this project. Distinct from the legacy Pages Router.

**Card** — Generic term for any payment method: credit cards (Nubank, Banco do Brasil, Renner, Midway) and accounts (Inter, Mercado Pago) for Pix and debit. Inherited from the original spreadsheet's "Cart" naming.

**Card closing** — The day a credit card bill is finalized and a new billing cycle starts. In Brazil, this varies month to month due to weekends and holidays.

**Cash receivable** — A loan the user has the right to receive back from someone else, paid as a single transaction.

**Cofrinho** — Brazilian banking term for an instant-liquidity savings instrument. Modeled as `liquid_savings` in this system.

**Credit receivable** — An installment-based receivable, typically a purchase made on the user's card on someone else's behalf.

**CSR** — Client-Side Rendering. Used sparingly; only when interactivity is required.

**Drizzle** — TypeScript-first ORM chosen for this project. See ADR-004.

**Drizzle Studio** — Drizzle's built-in database UI for inspection. Read-only use is fine; writes go through code.

**Fixed expense** — Recurring monthly expense with stable value (subscription, gym, mei tax). Distinct from cash and credit expenses because they are not entered per-occurrence.

**LCI / LCA / CDB** — Brazilian fixed-income financial products. Modeled as `fixed_income`.

**MEI** — Microempreendedor Individual. Brazilian small-business tax regime. The DAS MEI is the monthly tax payment.

**Migration** — In Drizzle context, a versioned SQL file that evolves the database schema. Generated via `drizzle-kit generate`, applied via `drizzle-kit migrate`.

**Monthly snapshot** — Per ADR-005, an immutable record of a month's consolidated totals. Replaces the original spreadsheet's "freeze past months" pattern.

**PR (Pull Request)** — GitHub mechanism for proposing changes with review before merging to `main`. Required for all changes in this project.

**Parcel** — A single installment of a credit card purchase. A 4× R$ 100 purchase has 4 parcels of R$ 100 each.

**PWA** — Progressive Web App. The application is installable on mobile devices without going through app stores.

**Reference month** — A date representing a month, always normalized to the first day (`yyyy-mm-01`).

**RLS** — Row Level Security. PostgreSQL feature used in this project (ADR-008) so the database itself enforces user isolation.

**RSC** — React Server Component. Default in App Router. Renders on the server, no JavaScript shipped to client. Used for reads.

**Server Action** — Function marked with `"use server"` that runs on the server but can be called from client components. Used for mutations.

**Snapshot** — See "monthly snapshot".

**Subcategory** — A specific child of a category (e.g., "Hygiene" under "Health"). Each expense is classified by subcategory.

**Supabase** — Backend-as-a-Service used for Postgres database, authentication, and (potentially) storage. See ADR-003.

**user_id** — UUID column present on every domain table. References `auth.users(id)` in Supabase. Used by RLS to filter rows. Required for defense in depth.

---

## 11. Known Risks and Open Questions

### 11.1 Identified Risks

**Risk 1 — Scope creep.** The temptation to add features (habit tracking, receipts, bank integrations) before MVP stabilizes is real. Mitigation: ADRs 009 and 010 explicitly defer; principles section enforces "single domain at a time".

**Risk 2 — Vendor lock-in to Supabase.** If Supabase pricing changes or service degrades, migration to self-hosted Postgres is needed. Mitigation: Drizzle abstracts SQL flavor; auth uses standard JWTs; data is exportable.

**Risk 3 — Personal motivation.** Hobby projects without deadline can stall indefinitely. Mitigation: each phase produces a deployable artifact, so progress is always visible and useful even if subsequent phases are paused.

**Risk 4 — Browser-based date handling edge cases.** JavaScript `Date` is notoriously tricky. Mitigation: use `date-fns`, store dates as `date` not `timestamp`, document timezone assumptions where they exist.

**Risk 5 — Floating-point money errors.** Mitigation: numeric strings end-to-end, parse only at display.

**Risk 6 — Migration script data loss.** The original spreadsheet has edge cases (cached `__xludf.DUMMYFUNCTION` values, hardcoded overrides, mixed date formats). Mitigation: dry-run mode mandatory; backup spreadsheet before migration; sample-check post-migration.

### 11.2 Open Questions

These are deliberately unresolved and will be addressed in later phases:

- **Receipt attachments.** Add to expenses? Storage location (Supabase Storage)? UX for capturing? Deferred (ADR-010).
- **Habit tracking domain.** Architecture is ready to host it, but no design work until financial system stabilizes (ADR-009).
- **Multi-currency.** Out of scope. May be revisited if travel use cases emerge.
- **Open Finance integration.** Out of scope for now. Brazilian Open Finance is mature but the integration overhead is significant for hobby scope.
- **Mobile app (React Native).** PWA chosen for MVP. May be revisited if PWA limitations are felt.
- **Backup automation.** Supabase has built-in backups; whether to add scheduled exports to user-owned storage is open.
- **Custom domain.** Default Vercel domain works for personal use. Custom domain optional later.

---

## 12. Version History

| Version | Date       | Changes |
|---------|------------|---------|
| 1.0     | 2026-04-25 | Major rewrite. Replaces all prior architecture documents. Reflects decision to build bespoke web app (Next.js + Supabase) after abandoning Notion experiment. |
| 1.1     | 2026-04-25 | Project named **moonbase**. Added section 7 (Visual Identity & UI Guidelines) covering color palette, typography, iconography, layout principles, key UI patterns, brand mark/PWA, voice and microcopy, and accessibility baseline. Renumbered subsequent sections (Migration Plan → 8, Principles → 9, Glossary → 10, Risks → 11, Version History → 12). Updated project root directory in section 6.1 from `finance-app/` to `moonbase/`. |

---

**End of document.**

> This document is the single source of truth for the project's architecture. Any change requires a PR. AI assistants (including Claude Code) should reference this document before generating any code, and should explicitly cite the relevant section/ADR when justifying implementation choices.

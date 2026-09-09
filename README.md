<div align="center">

```
　　　　 ✦
　　　🌙
　　　　　　　✦
　 ✦
```

# moonbase

**personal finance command center**

*built foundation by foundation — schema, logic, interface — one phase at a time*

[![Next.js](https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-postgres+auth-3ecf8e?style=flat-square&logo=supabase)](https://supabase.com)
[![Deployed on Vercel](https://img.shields.io/badge/Vercel-deployed-black?style=flat-square&logo=vercel)](https://moonbase-one.vercel.app)

</div>

---

## ○ what it is

moonbase is a single-user personal finance web app that replaced a Google Sheets workbook (in use since July 2024). it manages credit and cash expenses, recurring fixed costs, incomes, receivables, and investments — producing consolidated monthly and yearly reports.

the name evokes a personal command center: a self-sufficient base from which the user operates, plans, and controls their financial life. like a lunar outpost, it's built foundation by foundation and grows incrementally without losing coherence.

> the full source of truth — stack, ADRs, schema, conventions, visual identity, and migration phases — lives in [`docs/architecture.md`](docs/architecture.md).

---

## ◐ features

### finance

| area | what's in it |
|---|---|
| **month view** | KPI strip (balance, expenses, incomes, savings), expense breakdown by payment method and card, category chart, tabbed detail lists |
| **year view** | month-by-month evolution with live aggregates; snapshots win only when no raw data exists |
| **credit expenses** | installment tracking with parcel progress, card association, category, creation timestamp |
| **cash expenses** | pix / debit / cash entries, date, category, card/account |
| **recurring** | fixed monthly expenses (subscriptions, gym, bills) with start/end dates and payment method |
| **incomes** | salary, grants, refunds, fees, sales — any inflow with date and type |
| **receivables** | cash loans and credit installments owed to you, with paid/pending status per parcel |
| **investments** | liquid savings (cofrinhos) and fixed income (LCI, LCA, CDB) with yield tracking |
| **cards** | credit cards and accounts with color, closing day, due day, limit — fully editable |
| **categories** | hierarchical categories → subcategories with color and icon, used across all expense types |
| **snapshots** | immutable monthly totals for historical months; manual trigger + cron-ready endpoint |

### system

- **PWA installable** — manifest, standalone display, theme color
- **Google OAuth** via Supabase Auth
- **dark mode** — full palette for both light and dark, toggle in sidebar
- **mobile-first** — responsive layouts, horizontal-scrollable tab bars, touch-friendly targets
- **custom scrollbars** — thin, palette-matched, cross-browser

---

## ◑ stack

| layer | technology |
|---|---|
| framework | Next.js 16 — App Router, RSC, Server Actions |
| language | TypeScript strict |
| database | PostgreSQL via Supabase (Drizzle ORM) |
| auth | Supabase Auth — Google OAuth |
| ui | shadcn/ui (New York), Tailwind CSS 4, Radix primitives |
| forms | React Hook Form + Zod |
| charts | Recharts with custom palette |
| icons | lucide-react |
| fonts | Onest (sans), Fraunces (display), JetBrains Mono |
| testing | Vitest |
| deploy | Vercel (hobby) |

---

## ● getting started

**prerequisites:** Node.js 22+, pnpm 10+

```bash
pnpm install
cp .env.local.example .env.local   # fill in real values
pnpm dev                           # http://localhost:3000
```

### scripts

| command | does |
|---|---|
| `pnpm dev` | dev server (Turbopack) |
| `pnpm build` | production build |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm test` | Vitest, run-once |
| `pnpm format` | Prettier |

### environment

copy `.env.local.example` → `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
DATABASE_URL=
```

**never commit `.env.local`.**

---

## ◯ conventions

- **english** for code, identifiers, commits and PRs — **english** for UI
- every change goes through a **PR** — never push directly to `main`
- `lib/finance/*` is **pure** — no database calls, every function has a Vitest unit test
- money stored as `numeric(12,2)` strings — never floats
- all tables have `user_id` + Supabase RLS policies

---

## ◍ license

released under the [MIT License](LICENSE). it is a single-user app built for personal use — shared publicly as a reference implementation, not as a hosted product. no financial data of any kind lives in this repository.

---

<div align="center">

*moonbase · personal scale · built by [luanalorhanni](https://github.com/luanalorhanni)*

</div>

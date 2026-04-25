<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# moonbase — agent rules

This project is governed by [`docs/architecture.md`](docs/architecture.md). Read it before writing code; cite the relevant section/ADR when justifying choices.

## Non-negotiables

- **Every change goes through a PR.** Never commit to `main` directly.
- **Pure logic stays pure.** `lib/finance/*` does not touch the database; every function has a Vitest unit test in `__tests__/`.
- **Single source of truth.** Each rule lives in exactly one place — e.g., parcel calculation only in `lib/finance/parcels.ts`.
- **Type safety end-to-end.** Strict TypeScript, no `any`, Zod schemas as the source of truth for forms.
- **Server Actions for mutations, RSC for reads.** Route Handlers only when an external HTTP endpoint is required.
- **RLS on every table.** All Drizzle tables include `user_id` and Supabase RLS policies enforce `auth.uid() = user_id`.
- **Money as `numeric(12,2)` strings**, parsed only at the display boundary.
- **Mobile-first, PWA-installable from day 1.**
- **English for code, identifiers, commits and PRs; Brazilian Portuguese for UI.**

## Database changes

Never run statements directly against Supabase. Migrations are written as Drizzle scripts in `lib/db/migrations/` and applied by a human; document what the migration does and how to run it.

## Branch and commit conventions

- Branches: `feature/<short-description>`, `fix/<short-description>`, `docs/<short-description>`
- Commit messages: English, imperative present tense (e.g., "Add card closing lookup with fallback")
- One coherent change per commit; squash-merge keeps `main` clean

-- Add an optional `due_day` column to `card_closings` so the user can
-- override the bill due day per (card, month) — falls back to cards.due_day
-- when null. The closing day was already overridable; this completes the
-- per-month override pattern (ADR-006).
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0004_card_closings_due_day.sql

ALTER TABLE "card_closings" ADD COLUMN IF NOT EXISTS "due_day" integer;

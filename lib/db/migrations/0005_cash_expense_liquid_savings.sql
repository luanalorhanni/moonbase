-- Link a cash_expense to the liquid_savings (cofrinho) it was drawn from.
-- When set, the action layer decrements the savings' current balance
-- (latest_yield) by the expense amount on insert and reverses on
-- delete/update — so the user only edits one place.
--
-- ON DELETE SET NULL: removing the savings keeps the expense intact (just
-- breaks the linkage); the user has to manually re-link to another source.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0005_cash_expense_liquid_savings.sql

ALTER TABLE "cash_expenses"
  ADD COLUMN IF NOT EXISTS "liquid_savings_id" uuid
  REFERENCES "liquid_savings"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_cash_expenses_liquid_savings"
  ON "cash_expenses" ("liquid_savings_id")
  WHERE "liquid_savings_id" IS NOT NULL;

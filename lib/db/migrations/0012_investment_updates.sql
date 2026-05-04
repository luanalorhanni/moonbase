-- One row per balance update on a liquid_savings or fixed_income row.
-- Polymorphic: `investment_kind` + `investment_id` point at the parent.
-- Snapshots the current_value the user observed on `recorded_on`, so we
-- can reconstruct an investment's value over time and compute the real
-- gain (current minus applied) instead of just the latest mark.

CREATE TYPE "investment_kind" AS ENUM ('liquid_savings', 'fixed_income');

CREATE TABLE IF NOT EXISTS "investment_updates" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "investment_kind" "investment_kind" NOT NULL,
  "investment_id" uuid NOT NULL,
  "recorded_on" date NOT NULL,
  "current_value" numeric(12, 2) NOT NULL,
  "notes" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "investment_updates_one_per_day"
    UNIQUE ("investment_kind", "investment_id", "recorded_on")
);

CREATE INDEX IF NOT EXISTS "investment_updates_lookup_idx"
  ON "investment_updates" ("user_id", "investment_kind", "investment_id", "recorded_on" DESC);

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE "investment_updates" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "investment_updates_select_own" ON "investment_updates"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "investment_updates_insert_own" ON "investment_updates"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "investment_updates_update_own" ON "investment_updates"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "investment_updates_delete_own" ON "investment_updates"
  FOR DELETE USING (auth.uid() = user_id);

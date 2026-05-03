-- Track individual paid parcels of credit receivables. One row per paid
-- parcel; absent rows are unpaid. Cascades when the parent receivable is
-- deleted so we never leave orphaned status rows.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0003_credit_receivable_parcels_paid.sql

CREATE TABLE IF NOT EXISTS "credit_receivable_parcels_paid" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "receivable_id" uuid NOT NULL REFERENCES "credit_receivables"("id") ON DELETE CASCADE,
  "parcel_number" integer NOT NULL,
  "paid_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "credit_receivable_parcels_paid_receivable_parcel_unique"
    UNIQUE ("receivable_id", "parcel_number")
);

CREATE INDEX IF NOT EXISTS "idx_credit_receivable_parcels_paid_user"
  ON "credit_receivable_parcels_paid" ("user_id");

-- RLS — match policy template from architecture.md.
ALTER TABLE "credit_receivable_parcels_paid" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "credit_receivable_parcels_paid"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data" ON "credit_receivable_parcels_paid"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own data" ON "credit_receivable_parcels_paid"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own data" ON "credit_receivable_parcels_paid"
  FOR DELETE USING (auth.uid() = user_id);

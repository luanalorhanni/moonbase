-- Add credit_refunds: refunds (estornos) credited against a credit_expense.
-- A refund abates the credit total in one or more invoice months without
-- touching the original purchase, so the non-refunded parcels keep billing.
-- Single-month refund: total_parcels = 1. Estorno parcelado: total_parcels > 1,
-- spread from reference_month → last_parcel_month. Card and subcategory are
-- inherited from the parent expense at query time (not stored here).
-- Run: apply manually via Supabase SQL editor (direct connection, port 5432).

CREATE TABLE IF NOT EXISTS credit_refunds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credit_expense_id uuid NOT NULL REFERENCES credit_expenses(id) ON DELETE CASCADE,
  description text,
  parcel_value numeric(12, 2) NOT NULL,
  total_parcels integer NOT NULL DEFAULT 1,
  reference_month date NOT NULL,
  last_parcel_month date,
  created_at timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS credit_refunds_credit_expense_id_idx
  ON credit_refunds (credit_expense_id);

ALTER TABLE credit_refunds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own credit_refunds"
  ON credit_refunds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own credit_refunds"
  ON credit_refunds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own credit_refunds"
  ON credit_refunds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own credit_refunds"
  ON credit_refunds FOR DELETE USING (auth.uid() = user_id);

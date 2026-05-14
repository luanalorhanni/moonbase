-- Add monthly_budgets and monthly_category_budgets tables for spending goals.
-- Run: pnpm db:migrate  (or apply manually via Supabase SQL editor)

CREATE TABLE IF NOT EXISTS monthly_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_month date NOT NULL,
  max_credit numeric(12, 2),
  max_cash numeric(12, 2),
  max_total numeric(12, 2),
  created_at timestamp NOT NULL DEFAULT now(),
  updated_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT monthly_budgets_user_month_unique UNIQUE (user_id, reference_month)
);

ALTER TABLE monthly_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own monthly_budgets"
  ON monthly_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly_budgets"
  ON monthly_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly_budgets"
  ON monthly_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own monthly_budgets"
  ON monthly_budgets FOR DELETE USING (auth.uid() = user_id);

-- ─────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monthly_category_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reference_month date NOT NULL,
  category_id uuid NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  max_amount numeric(12, 2) NOT NULL,
  created_at timestamp NOT NULL DEFAULT now(),
  CONSTRAINT monthly_category_budgets_user_month_cat_unique
    UNIQUE (user_id, reference_month, category_id)
);

ALTER TABLE monthly_category_budgets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own monthly_category_budgets"
  ON monthly_category_budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own monthly_category_budgets"
  ON monthly_category_budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own monthly_category_budgets"
  ON monthly_category_budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own monthly_category_budgets"
  ON monthly_category_budgets FOR DELETE USING (auth.uid() = user_id);

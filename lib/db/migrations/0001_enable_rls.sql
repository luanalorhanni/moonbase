-- Enable Row Level Security on every domain table and apply the four
-- canonical policies (read/insert/update/delete) scoped by auth.uid().
-- See ADR-008 in docs/architecture.md.
--
-- The service_role key bypasses RLS, so server-only code (cron handlers,
-- migration scripts) can still operate cross-user when needed.

-- card_closings ---------------------------------------------------------

ALTER TABLE "card_closings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "card_closings_select_own" ON "card_closings"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "card_closings_insert_own" ON "card_closings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "card_closings_update_own" ON "card_closings"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "card_closings_delete_own" ON "card_closings"
  FOR DELETE USING (auth.uid() = user_id);

-- cards -----------------------------------------------------------------

ALTER TABLE "cards" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cards_select_own" ON "cards"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cards_insert_own" ON "cards"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cards_update_own" ON "cards"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cards_delete_own" ON "cards"
  FOR DELETE USING (auth.uid() = user_id);

-- cash_expenses ---------------------------------------------------------

ALTER TABLE "cash_expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_expenses_select_own" ON "cash_expenses"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cash_expenses_insert_own" ON "cash_expenses"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cash_expenses_update_own" ON "cash_expenses"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cash_expenses_delete_own" ON "cash_expenses"
  FOR DELETE USING (auth.uid() = user_id);

-- cash_receivables ------------------------------------------------------

ALTER TABLE "cash_receivables" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cash_receivables_select_own" ON "cash_receivables"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "cash_receivables_insert_own" ON "cash_receivables"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cash_receivables_update_own" ON "cash_receivables"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "cash_receivables_delete_own" ON "cash_receivables"
  FOR DELETE USING (auth.uid() = user_id);

-- categories ------------------------------------------------------------

ALTER TABLE "categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_select_own" ON "categories"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "categories_insert_own" ON "categories"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_update_own" ON "categories"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "categories_delete_own" ON "categories"
  FOR DELETE USING (auth.uid() = user_id);

-- credit_expenses -------------------------------------------------------

ALTER TABLE "credit_expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_expenses_select_own" ON "credit_expenses"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_expenses_insert_own" ON "credit_expenses"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_expenses_update_own" ON "credit_expenses"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_expenses_delete_own" ON "credit_expenses"
  FOR DELETE USING (auth.uid() = user_id);

-- credit_receivables ----------------------------------------------------

ALTER TABLE "credit_receivables" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "credit_receivables_select_own" ON "credit_receivables"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "credit_receivables_insert_own" ON "credit_receivables"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_receivables_update_own" ON "credit_receivables"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "credit_receivables_delete_own" ON "credit_receivables"
  FOR DELETE USING (auth.uid() = user_id);

-- fixed_expenses --------------------------------------------------------

ALTER TABLE "fixed_expenses" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_expenses_select_own" ON "fixed_expenses"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_expenses_insert_own" ON "fixed_expenses"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_expenses_update_own" ON "fixed_expenses"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_expenses_delete_own" ON "fixed_expenses"
  FOR DELETE USING (auth.uid() = user_id);

-- fixed_income ----------------------------------------------------------

ALTER TABLE "fixed_income" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "fixed_income_select_own" ON "fixed_income"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "fixed_income_insert_own" ON "fixed_income"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_income_update_own" ON "fixed_income"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "fixed_income_delete_own" ON "fixed_income"
  FOR DELETE USING (auth.uid() = user_id);

-- incomes ---------------------------------------------------------------

ALTER TABLE "incomes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "incomes_select_own" ON "incomes"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "incomes_insert_own" ON "incomes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_update_own" ON "incomes"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "incomes_delete_own" ON "incomes"
  FOR DELETE USING (auth.uid() = user_id);

-- liquid_savings --------------------------------------------------------

ALTER TABLE "liquid_savings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "liquid_savings_select_own" ON "liquid_savings"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "liquid_savings_insert_own" ON "liquid_savings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liquid_savings_update_own" ON "liquid_savings"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "liquid_savings_delete_own" ON "liquid_savings"
  FOR DELETE USING (auth.uid() = user_id);

-- monthly_snapshots -----------------------------------------------------

ALTER TABLE "monthly_snapshots" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "monthly_snapshots_select_own" ON "monthly_snapshots"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "monthly_snapshots_insert_own" ON "monthly_snapshots"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_snapshots_update_own" ON "monthly_snapshots"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "monthly_snapshots_delete_own" ON "monthly_snapshots"
  FOR DELETE USING (auth.uid() = user_id);

-- subcategories ---------------------------------------------------------

ALTER TABLE "subcategories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subcategories_select_own" ON "subcategories"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "subcategories_insert_own" ON "subcategories"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subcategories_update_own" ON "subcategories"
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "subcategories_delete_own" ON "subcategories"
  FOR DELETE USING (auth.uid() = user_id);

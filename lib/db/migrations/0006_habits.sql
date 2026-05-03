-- Habit tracking domain — unlocks ADR-009 (originally deferred).
-- Sister domain to finance, reuses auth/RLS/design system but lives on its
-- own tables. Boolean-only: presence of a habit_log row for (habit, date)
-- means "the user succeeded that day". Two schedules supported now: daily
-- and weekly_target (N times/week, no fixed days).
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0006_habits.sql

CREATE TYPE "habit_polarity" AS ENUM ('do', 'avoid');
CREATE TYPE "habit_schedule" AS ENUM ('daily', 'weekly_target');

-- ─── habit_categories ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "habit_categories" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "color" text NOT NULL DEFAULT '#7e82aa',
  "icon" text,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_habit_categories_user"
  ON "habit_categories" ("user_id");

ALTER TABLE "habit_categories" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "habit_categories"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data" ON "habit_categories"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own data" ON "habit_categories"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own data" ON "habit_categories"
  FOR DELETE USING (auth.uid() = user_id);

-- ─── habits ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "habits" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "category_id" uuid REFERENCES "habit_categories"("id") ON DELETE SET NULL,
  "polarity" habit_polarity NOT NULL DEFAULT 'do',
  "schedule" habit_schedule NOT NULL DEFAULT 'daily',
  "target_per_week" integer,
  "color" text NOT NULL DEFAULT '#7e82aa',
  "icon" text,
  "is_active" boolean NOT NULL DEFAULT true,
  "created_at" timestamp NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS "idx_habits_user" ON "habits" ("user_id");

ALTER TABLE "habits" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "habits"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data" ON "habits"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own data" ON "habits"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own data" ON "habits"
  FOR DELETE USING (auth.uid() = user_id);

-- ─── habit_logs ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS "habit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL,
  "habit_id" uuid NOT NULL REFERENCES "habits"("id") ON DELETE CASCADE,
  "date" date NOT NULL,
  "note" text,
  "created_at" timestamp NOT NULL DEFAULT now(),
  CONSTRAINT "habit_logs_habit_date_unique" UNIQUE ("habit_id", "date")
);

CREATE INDEX IF NOT EXISTS "idx_habit_logs_user_date"
  ON "habit_logs" ("user_id", "date" DESC);

ALTER TABLE "habit_logs" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data" ON "habit_logs"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own data" ON "habit_logs"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own data" ON "habit_logs"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own data" ON "habit_logs"
  FOR DELETE USING (auth.uid() = user_id);

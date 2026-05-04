-- Journal — end-of-day reflection (one entry per user per day) plus an
-- independent collection of quotes captured ad hoc.

CREATE TABLE IF NOT EXISTS "journal_entries" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "entry_date" date NOT NULL,
  "mood" smallint,
  "content" text,
  "cover_url" text,
  "cover_thumb_url" text,
  "cover_alt" text,
  "cover_photographer_name" text,
  "cover_photographer_url" text,
  "cover_unsplash_id" text,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp DEFAULT now() NOT NULL,
  CONSTRAINT "journal_entries_user_date_unique" UNIQUE ("user_id", "entry_date"),
  CONSTRAINT "journal_entries_mood_range" CHECK ("mood" IS NULL OR ("mood" BETWEEN 1 AND 5))
);

CREATE INDEX IF NOT EXISTS "journal_entries_user_date_idx"
  ON "journal_entries" ("user_id", "entry_date" DESC);

CREATE TABLE IF NOT EXISTS "journal_quotes" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id" uuid NOT NULL,
  "text" text NOT NULL,
  "author" text,
  "source" text,
  "collected_on" date NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS "journal_quotes_user_collected_idx"
  ON "journal_quotes" ("user_id", "collected_on" DESC);

-- ─── RLS ────────────────────────────────────────────────────────────

ALTER TABLE "journal_entries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "journal_quotes" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "journal_entries_select_own" ON "journal_entries"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_insert_own" ON "journal_entries"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_entries_update_own" ON "journal_entries"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journal_entries_delete_own" ON "journal_entries"
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "journal_quotes_select_own" ON "journal_quotes"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "journal_quotes_insert_own" ON "journal_quotes"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "journal_quotes_update_own" ON "journal_quotes"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "journal_quotes_delete_own" ON "journal_quotes"
  FOR DELETE USING (auth.uid() = user_id);

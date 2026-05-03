-- User-scoped preferences for things that don't belong to a specific
-- domain entity. First inhabitant: the home page cover image (Unsplash)
-- and the inspirational quote shown alongside it.
--
-- Single-row-per-user table (PK is user_id) so writes are upserts and
-- reads are cheap. Future preferences (theme overrides, language,
-- pinned widgets, etc.) live here too.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0007_user_settings.sql

CREATE TABLE IF NOT EXISTS "user_settings" (
  "user_id" uuid PRIMARY KEY,
  "home_cover_url" text,
  "home_cover_thumb_url" text,
  "home_cover_alt" text,
  "home_cover_photographer_name" text,
  "home_cover_photographer_url" text,
  "home_cover_unsplash_id" text,
  "home_quote" text,
  "home_quote_author" text,
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "user_settings" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own settings" ON "user_settings"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own settings" ON "user_settings"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own settings" ON "user_settings"
  FOR UPDATE USING (auth.uid() = user_id);

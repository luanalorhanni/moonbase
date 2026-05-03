-- OAuth tokens for Google Calendar integration. Single row per user
-- (PK is user_id) — when the user reconnects, we upsert.
--
-- Refresh token is nullable because Google only returns it on the
-- first consent (or when the user explicitly re-consents with
-- prompt=consent). Once we have one, we keep using it until the user
-- disconnects.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0009_google_calendar_tokens.sql

CREATE TABLE IF NOT EXISTS "google_calendar_tokens" (
  "user_id" uuid PRIMARY KEY,
  "access_token" text NOT NULL,
  "refresh_token" text,
  "scope" text NOT NULL,
  "token_type" text NOT NULL DEFAULT 'Bearer',
  "expiry" timestamp NOT NULL,
  "email" text,
  "connected_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp NOT NULL DEFAULT now()
);

ALTER TABLE "google_calendar_tokens" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own tokens" ON "google_calendar_tokens"
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tokens" ON "google_calendar_tokens"
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tokens" ON "google_calendar_tokens"
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tokens" ON "google_calendar_tokens"
  FOR DELETE USING (auth.uid() = user_id);

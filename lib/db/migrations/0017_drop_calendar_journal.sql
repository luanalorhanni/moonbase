-- Remove the calendar and journal features.
--
-- Drops the tables backing two removed domains:
--   * journal        → journal_entries, journal_quotes
--   * calendar        → google_calendar_tokens (Google Calendar OAuth tokens)
--
-- CASCADE also removes their RLS policies. This is a destructive, one-way
-- migration — back up any journal/calendar data before applying if you might
-- want it later.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0017_drop_calendar_journal.sql
-- or run manually via the Supabase SQL editor (direct connection, port 5432).

DROP TABLE IF EXISTS "journal_quotes" CASCADE;
DROP TABLE IF EXISTS "journal_entries" CASCADE;
DROP TABLE IF EXISTS "google_calendar_tokens" CASCADE;

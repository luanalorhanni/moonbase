-- Add the home page's Spotify embed URL to user_settings. We keep just
-- the canonical share URL — the home page extracts the type/id and
-- builds the embed URL at render time.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0008_user_settings_spotify.sql

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "home_spotify_url" text;

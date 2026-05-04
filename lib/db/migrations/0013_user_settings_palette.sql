-- User-selectable color palette. Stores the preset id; each id maps to a
-- bundle of CSS-variable overrides applied at render time. Default 'lunar'
-- mirrors the original moonbase palette.

ALTER TABLE "user_settings"
  ADD COLUMN IF NOT EXISTS "palette" text NOT NULL DEFAULT 'lunar';

-- Add optional title column to journal_entries.
-- Run: pnpm drizzle-kit migrate  (or apply manually via Supabase SQL editor)

ALTER TABLE journal_entries
  ADD COLUMN IF NOT EXISTS title text;

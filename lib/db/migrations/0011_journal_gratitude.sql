-- Add a list of gratitude items to journal entries — what the user
-- wants to remember as motives to be thankful for that day.

ALTER TABLE "journal_entries"
  ADD COLUMN IF NOT EXISTS "gratitude" text[];

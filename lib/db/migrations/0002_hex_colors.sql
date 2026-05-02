-- Convert cards.color and categories.color from a fixed enum to free-form
-- hex strings (e.g. "#ef4444"). Existing named values are mapped to their
-- canonical Tailwind hex.
--
-- Apply with:
--   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs lib/db/migrations/0002_hex_colors.sql

-- ──────────────────────────────────────────────────────────────────────────
-- cards.color
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE "cards" ADD COLUMN "color_new" text;

UPDATE "cards" SET "color_new" = CASE "color"::text
  WHEN 'red'    THEN '#ef4444'
  WHEN 'orange' THEN '#f97316'
  WHEN 'yellow' THEN '#facc15'
  WHEN 'green'  THEN '#22c55e'
  WHEN 'blue'   THEN '#3b82f6'
  WHEN 'purple' THEN '#a855f7'
  WHEN 'pink'   THEN '#ec4899'
  WHEN 'brown'  THEN '#b45309'
  WHEN 'gray'   THEN '#9ca3af'
  ELSE               '#a855f7'
END;

ALTER TABLE "cards" ALTER COLUMN "color" DROP DEFAULT;
ALTER TABLE "cards" DROP COLUMN "color";
ALTER TABLE "cards" RENAME COLUMN "color_new" TO "color";
ALTER TABLE "cards" ALTER COLUMN "color" SET NOT NULL;
ALTER TABLE "cards" ALTER COLUMN "color" SET DEFAULT '#a855f7';

-- ──────────────────────────────────────────────────────────────────────────
-- categories.color
-- ──────────────────────────────────────────────────────────────────────────
ALTER TABLE "categories" ADD COLUMN "color_new" text;

UPDATE "categories" SET "color_new" = CASE "color"::text
  WHEN 'red'    THEN '#ef4444'
  WHEN 'orange' THEN '#f97316'
  WHEN 'yellow' THEN '#facc15'
  WHEN 'green'  THEN '#22c55e'
  WHEN 'blue'   THEN '#3b82f6'
  WHEN 'purple' THEN '#a855f7'
  WHEN 'pink'   THEN '#ec4899'
  WHEN 'brown'  THEN '#b45309'
  WHEN 'gray'   THEN '#9ca3af'
  ELSE               '#a855f7'
END;

ALTER TABLE "categories" ALTER COLUMN "color" DROP DEFAULT;
ALTER TABLE "categories" DROP COLUMN "color";
ALTER TABLE "categories" RENAME COLUMN "color_new" TO "color";
ALTER TABLE "categories" ALTER COLUMN "color" SET NOT NULL;
ALTER TABLE "categories" ALTER COLUMN "color" SET DEFAULT '#a855f7';

-- The "color" enum type is no longer referenced — drop it to keep the schema clean.
DROP TYPE IF EXISTS "color";

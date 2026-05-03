import "server-only";

import { eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type UserSettingsRow = typeof schema.userSettings.$inferSelect;

/**
 * Single-row-per-user lookup. Returns null when the user has never
 * touched their preferences — callers should fall back to defaults.
 */
export const getUserSettings = cachedQuery(
  "getUserSettings",
  [TAGS.userSettings],
  async (userId): Promise<UserSettingsRow | null> => {
    const rows = await db
      .select()
      .from(schema.userSettings)
      .where(eq(schema.userSettings.userId, userId))
      .limit(1);
    return rows[0] ?? null;
  },
);

import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

export type JournalEntryRow = typeof schema.journalEntries.$inferSelect;
export type JournalQuoteRow = typeof schema.journalQuotes.$inferSelect;

/**
 * All entries for the user, newest first. Volume is bounded by 365
 * rows/year so we don't paginate for now.
 */
export const listJournalEntries = cachedQuery(
  "listJournalEntries",
  [TAGS.journalEntries],
  async (userId): Promise<JournalEntryRow[]> => {
    return db
      .select()
      .from(schema.journalEntries)
      .where(eq(schema.journalEntries.userId, userId))
      .orderBy(desc(schema.journalEntries.entryDate));
  },
);

/**
 * Look up an entry by its date (yyyy-mm-dd). Used by the editor when
 * the user opens a specific day.
 */
export async function getJournalEntryByDate(
  userId: string,
  entryDate: string,
): Promise<JournalEntryRow | null> {
  const rows = await db
    .select()
    .from(schema.journalEntries)
    .where(
      and(
        eq(schema.journalEntries.userId, userId),
        eq(schema.journalEntries.entryDate, entryDate),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
}

export const listJournalQuotes = cachedQuery(
  "listJournalQuotes",
  [TAGS.journalQuotes],
  async (userId): Promise<JournalQuoteRow[]> => {
    return db
      .select()
      .from(schema.journalQuotes)
      .where(eq(schema.journalQuotes.userId, userId))
      .orderBy(desc(schema.journalQuotes.collectedOn), desc(schema.journalQuotes.createdAt));
  },
);

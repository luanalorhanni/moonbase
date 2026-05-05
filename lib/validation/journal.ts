import { z } from "zod";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "invalid date (expected yyyy-mm-dd)");

const trimmedNullable = z.union([z.string(), z.null(), z.undefined()]).transform((v) => {
  if (v === null || v === undefined) return null;
  const t = v.trim();
  return t.length === 0 ? null : t;
});

export const journalEntrySchema = z
  .object({
    entryDate: isoDate,
    mood: z
      .union([z.number().int().min(1).max(5), z.null(), z.undefined()])
      .transform((v) => (v === undefined ? null : v)),
    /** Trimmed list of gratitude items. Empty entries are dropped, an
     *  all-empty list collapses to null so the column stays sparse. */
    gratitude: z.union([z.array(z.string()), z.null(), z.undefined()]).transform((v) => {
      if (!v) return null;
      const cleaned = v.map((s) => s.trim()).filter((s) => s.length > 0);
      return cleaned.length > 0 ? cleaned : null;
    }),
    title: trimmedNullable,
    content: trimmedNullable,
    coverUrl: trimmedNullable,
    coverThumbUrl: trimmedNullable,
    coverAlt: trimmedNullable,
    coverPhotographerName: trimmedNullable,
    coverPhotographerUrl: trimmedNullable,
    coverUnsplashId: trimmedNullable,
  })
  .refine(
    // At least one of mood / gratitude / content / cover should be
    // present — an entry that's purely empty is just noise.
    (e) => e.mood !== null || e.gratitude !== null || e.content !== null || e.coverUrl !== null,
    { message: "add at least a mood, gratitude, text, or cover." },
  );

export type JournalEntryInput = z.input<typeof journalEntrySchema>;
export type JournalEntryParsed = z.output<typeof journalEntrySchema>;

export const journalQuoteSchema = z.object({
  text: z.string().trim().min(1, "the quote can't be empty."),
  author: trimmedNullable,
  source: trimmedNullable,
  collectedOn: isoDate,
});

export type JournalQuoteInput = z.input<typeof journalQuoteSchema>;
export type JournalQuoteParsed = z.output<typeof journalQuoteSchema>;

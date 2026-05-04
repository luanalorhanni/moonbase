"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { invalidate, TAGS } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import {
  journalEntrySchema,
  journalQuoteSchema,
  type JournalEntryInput,
  type JournalQuoteInput,
} from "@/lib/validation/journal";

export type ActionResult = { ok: true } | { ok: false; error: string };

/**
 * Upsert a journal entry by `(user_id, entry_date)`. The unique
 * constraint guarantees one row per day; we use `ON CONFLICT` to
 * replace the existing row's editable fields without spawning
 * duplicates when the user re-saves the same day.
 */
export async function saveJournalEntry(input: JournalEntryInput): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = journalEntrySchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "entrada inválida." };
  }
  const e = parsed.data;
  try {
    await db
      .insert(schema.journalEntries)
      .values({
        userId: user.id,
        entryDate: e.entryDate,
        mood: e.mood,
        gratitude: e.gratitude,
        content: e.content,
        coverUrl: e.coverUrl,
        coverThumbUrl: e.coverThumbUrl,
        coverAlt: e.coverAlt,
        coverPhotographerName: e.coverPhotographerName,
        coverPhotographerUrl: e.coverPhotographerUrl,
        coverUnsplashId: e.coverUnsplashId,
      })
      .onConflictDoUpdate({
        target: [schema.journalEntries.userId, schema.journalEntries.entryDate],
        set: {
          mood: e.mood,
          gratitude: e.gratitude,
          content: e.content,
          coverUrl: e.coverUrl,
          coverThumbUrl: e.coverThumbUrl,
          coverAlt: e.coverAlt,
          coverPhotographerName: e.coverPhotographerName,
          coverPhotographerUrl: e.coverPhotographerUrl,
          coverUnsplashId: e.coverUnsplashId,
          updatedAt: new Date(),
        },
      });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erro ao salvar a entrada.",
    };
  }
  invalidate(TAGS.journalEntries);
  revalidatePath("/journal");
  return { ok: true };
}

export async function deleteJournalEntry(entryDate: string): Promise<ActionResult> {
  const user = await requireUser();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)) {
    return { ok: false, error: "data inválida." };
  }
  try {
    await db
      .delete(schema.journalEntries)
      .where(
        and(
          eq(schema.journalEntries.userId, user.id),
          eq(schema.journalEntries.entryDate, entryDate),
        ),
      );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erro ao excluir.",
    };
  }
  invalidate(TAGS.journalEntries);
  revalidatePath("/journal");
  return { ok: true };
}

export async function saveJournalQuote(
  input: JournalQuoteInput & { id?: string | null },
): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = journalQuoteSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "frase inválida." };
  }
  const q = parsed.data;
  try {
    if (input.id) {
      await db
        .update(schema.journalQuotes)
        .set({
          text: q.text,
          author: q.author,
          source: q.source,
          collectedOn: q.collectedOn,
        })
        .where(
          and(
            eq(schema.journalQuotes.userId, user.id),
            eq(schema.journalQuotes.id, input.id),
          ),
        );
    } else {
      await db.insert(schema.journalQuotes).values({
        userId: user.id,
        text: q.text,
        author: q.author,
        source: q.source,
        collectedOn: q.collectedOn,
      });
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erro ao salvar a frase.",
    };
  }
  invalidate(TAGS.journalQuotes);
  revalidatePath("/journal");
  return { ok: true };
}

export async function deleteJournalQuote(id: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    await db
      .delete(schema.journalQuotes)
      .where(
        and(
          eq(schema.journalQuotes.userId, user.id),
          eq(schema.journalQuotes.id, id),
        ),
      );
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "erro ao excluir.",
    };
  }
  invalidate(TAGS.journalQuotes);
  revalidatePath("/journal");
  return { ok: true };
}

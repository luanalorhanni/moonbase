"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { db, schema } from "@/lib/db";
import { parseSpotifyUrl } from "@/lib/spotify";
import { PALETTES } from "@/lib/theme/palettes";

export type UserSettingsActionResult = { ok: true } | { ok: false; error: string };

export type CoverInput = {
  url: string;
  thumbUrl: string;
  alt: string | null;
  photographerName: string;
  photographerUrl: string;
  unsplashId: string;
};

/**
 * Upsert the home cover for the current user. Always rewrites the
 * cover columns; quote columns are left untouched. Idempotent.
 */
export async function setHomeCover(input: CoverInput): Promise<UserSettingsActionResult> {
  const user = await requireUser();
  if (!input.url || !input.unsplashId) {
    return { ok: false, error: "invalid image." };
  }

  const data = {
    userId: user.id,
    homeCoverUrl: input.url,
    homeCoverThumbUrl: input.thumbUrl,
    homeCoverAlt: input.alt,
    homeCoverPhotographerName: input.photographerName,
    homeCoverPhotographerUrl: input.photographerUrl,
    homeCoverUnsplashId: input.unsplashId,
  } as const;

  await db
    .insert(schema.userSettings)
    .values(data)
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        homeCoverUrl: data.homeCoverUrl,
        homeCoverThumbUrl: data.homeCoverThumbUrl,
        homeCoverAlt: data.homeCoverAlt,
        homeCoverPhotographerName: data.homeCoverPhotographerName,
        homeCoverPhotographerUrl: data.homeCoverPhotographerUrl,
        homeCoverUnsplashId: data.homeCoverUnsplashId,
        updatedAt: new Date(),
      },
    });

  invalidate(TAGS.userSettings);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Persist the home page's Spotify embed URL. Pass `null` (or an empty
 * string) to clear it. The URL is validated against
 * {@link parseSpotifyUrl} so we never store something we can't render.
 */
export async function setHomeSpotifyUrl(url: string | null): Promise<UserSettingsActionResult> {
  const user = await requireUser();
  const trimmed = (url ?? "").trim();
  let canonical: string | null = null;
  if (trimmed !== "") {
    const ref = parseSpotifyUrl(trimmed);
    if (!ref) {
      return {
        ok: false,
        error: "invalid URL — paste a Spotify playlist, album, or track link.",
      };
    }
    // Re-canonicalize: drop tracking params, normalize to https://open.spotify.com/...
    canonical = `https://open.spotify.com/${ref.kind}/${ref.id}`;
  }

  await db
    .insert(schema.userSettings)
    .values({ userId: user.id, homeSpotifyUrl: canonical })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: { homeSpotifyUrl: canonical, updatedAt: new Date() },
    });

  invalidate(TAGS.userSettings);
  revalidatePath("/");
  return { ok: true };
}

export async function setHomeQuote(
  quote: string,
  author: string | null,
): Promise<UserSettingsActionResult> {
  const user = await requireUser();
  const trimmedQuote = quote.trim();
  const trimmedAuthor = author?.trim() ?? null;

  // Quote can be empty (clears it). Author optional.
  await db
    .insert(schema.userSettings)
    .values({
      userId: user.id,
      homeQuote: trimmedQuote === "" ? null : trimmedQuote,
      homeQuoteAuthor: trimmedAuthor === "" ? null : trimmedAuthor,
    })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: {
        homeQuote: trimmedQuote === "" ? null : trimmedQuote,
        homeQuoteAuthor: trimmedAuthor === "" ? null : trimmedAuthor,
        updatedAt: new Date(),
      },
    });

  invalidate(TAGS.userSettings);
  revalidatePath("/");
  return { ok: true };
}

/**
 * Switch the active color palette. Validates against the curated list
 * in `lib/theme/palettes.ts` so we can't end up with an unknown id
 * persisted in the database.
 */
export async function setPalette(paletteId: string): Promise<UserSettingsActionResult> {
  const user = await requireUser();
  const known = PALETTES.some((p) => p.id === paletteId);
  if (!known) return { ok: false, error: "unknown palette." };

  await db
    .insert(schema.userSettings)
    .values({ userId: user.id, palette: paletteId })
    .onConflictDoUpdate({
      target: schema.userSettings.userId,
      set: { palette: paletteId, updatedAt: new Date() },
    });

  invalidate(TAGS.userSettings);
  // Palette cascades through every page, so revalidate the layout root.
  revalidatePath("/", "layout");
  return { ok: true };
}

/**
 * Hits Unsplash's `download_location` endpoint per their API
 * guidelines whenever a user picks a photo. Required by their TOS to
 * count "downloads" — without this we'd be in violation.
 */
export async function trackUnsplashDownload(
  downloadLocation: string,
): Promise<UserSettingsActionResult> {
  await requireUser();
  const accessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (!accessKey) return { ok: false, error: "UNSPLASH_ACCESS_KEY not configured." };
  try {
    await fetch(downloadLocation, {
      headers: { Authorization: `Client-ID ${accessKey}` },
    });
  } catch {
    // Swallow — tracking is best-effort.
  }
  return { ok: true };
}

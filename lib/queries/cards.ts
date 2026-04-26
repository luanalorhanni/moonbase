import "server-only";

import { asc, eq } from "drizzle-orm";

import { TAGS } from "@/lib/cache/tags";
import { cachedQuery } from "@/lib/cache/with-cache";
import { db, schema } from "@/lib/db";

/**
 * Read-side queries for the cards table. Server-only — never imported from
 * client components. Every query is filtered by user_id even though Supabase
 * RLS is also configured (defence in depth, per arch section 6.2). The
 * Drizzle client connects as the postgres role and bypasses RLS, so
 * application-level scoping is the actual enforcement here.
 */

export const listCards = cachedQuery("listCards", [TAGS.cards], (userId) =>
  db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.userId, userId))
    .orderBy(asc(schema.cards.name)),
);

export async function getCard(id: string) {
  const cards = await listCards();
  return cards.find((c) => c.id === id) ?? null;
}

export type CardRow = Awaited<ReturnType<typeof listCards>>[number];

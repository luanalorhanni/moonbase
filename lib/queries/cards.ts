import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";

/**
 * Read-side queries for the cards table. Server-only — never imported from
 * client components. Every query is filtered by user_id even though Supabase
 * RLS is also configured (defence in depth, per arch section 6.2). The
 * Drizzle client connects as the postgres role and bypasses RLS, so
 * application-level scoping is the actual enforcement here.
 */

export async function listCards() {
  const user = await requireUser();
  return db
    .select()
    .from(schema.cards)
    .where(eq(schema.cards.userId, user.id))
    .orderBy(asc(schema.cards.name));
}

export async function getCard(id: string) {
  const user = await requireUser();
  const rows = await db
    .select()
    .from(schema.cards)
    .where(and(eq(schema.cards.id, id), eq(schema.cards.userId, user.id)))
    .limit(1);
  return rows[0] ?? null;
}

export type CardRow = Awaited<ReturnType<typeof listCards>>[number];

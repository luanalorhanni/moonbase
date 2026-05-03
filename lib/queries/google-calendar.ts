import "server-only";

import { eq } from "drizzle-orm";

import { requireUser } from "@/lib/auth/session";
import { db, schema } from "@/lib/db";
import {
  type Calendar,
  type CalendarEvent,
  canWriteEvents,
  listEvents,
} from "@/lib/google-calendar";

export type GoogleCalendarConnection =
  | {
      connected: true;
      email: string | null;
      scope: string;
      canWrite: boolean;
      connectedAt: Date;
    }
  | {
      connected: false;
    };

/**
 * Read-side check: is the user connected? Returns the email so the UI
 * can confirm "connected to luana@gmail.com" plus the write capability
 * derived from the granted scopes.
 */
export async function getGoogleCalendarConnection(): Promise<GoogleCalendarConnection> {
  const user = await requireUser();
  const rows = await db
    .select({
      email: schema.googleCalendarTokens.email,
      scope: schema.googleCalendarTokens.scope,
      connectedAt: schema.googleCalendarTokens.connectedAt,
    })
    .from(schema.googleCalendarTokens)
    .where(eq(schema.googleCalendarTokens.userId, user.id))
    .limit(1);
  const row = rows[0];
  if (!row) return { connected: false };
  return {
    connected: true,
    email: row.email,
    scope: row.scope,
    canWrite: canWriteEvents(row.scope),
    connectedAt: row.connectedAt,
  };
}

/**
 * Wider window for the week view (±2 weeks of free navigation without
 * round-trips). Past 7 days through next 60. Aggregates events from
 * every selected calendar, returning the full calendar list too so
 * the UI can render colored badges.
 */
export async function listEventsWindow(): Promise<{
  email: string | null;
  calendars: Calendar[];
  events: CalendarEvent[];
  canWrite: boolean;
} | null> {
  const user = await requireUser();
  const from = new Date();
  from.setDate(from.getDate() - 7);
  from.setHours(0, 0, 0, 0);
  const to = new Date();
  to.setDate(to.getDate() + 60);
  to.setHours(23, 59, 59, 999);
  const result = await listEvents(user.id, from, to, 250);
  if (!result) return null;
  return {
    email: result.email,
    calendars: result.calendars,
    events: result.events,
    canWrite: canWriteEvents(result.scope),
  };
}

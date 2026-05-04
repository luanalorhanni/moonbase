import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type {
  Calendar,
  CalendarEvent,
  EventReminder,
  EventTransparency,
  EventVisibility,
} from "@/lib/google-calendar-shared";

// Re-export the client-safe types/constants so existing server-side
// imports of `@/lib/google-calendar` keep working unchanged.
export {
  GOOGLE_EVENT_COLORS,
  type Calendar,
  type CalendarEvent,
  type EventReminder,
  type EventTransparency,
  type EventVisibility,
} from "@/lib/google-calendar-shared";

/**
 * Server-side Google Calendar helpers — OAuth handshake, token
 * refresh, calendar list, multi-calendar event fetch, event creation.
 * The user-facing flow lives in route handlers
 * (`app/api/google-calendar/*`); pages and server actions consume the
 * pure helpers exported here.
 */

const GOOGLE_OAUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_API_BASE = "https://www.googleapis.com/calendar/v3";

export const SCOPES = [
  // Read every calendar's metadata + events.
  "https://www.googleapis.com/auth/calendar.readonly",
  // Create / update / delete events on calendars the user can write to.
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/userinfo.email",
];

/** True when the persisted scope grants event-write access. */
export function canWriteEvents(scope: string): boolean {
  if (!scope) return false;
  // Google returns scopes as space-separated. Test for either the
  // narrow events scope or the full calendar scope.
  const list = scope.split(/\s+/);
  return list.some(
    (s) =>
      s === "https://www.googleapis.com/auth/calendar.events" ||
      s === "https://www.googleapis.com/auth/calendar",
  );
}

function envOrThrow(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`${name} not set in .env.local`);
  return v;
}

export function googleClientId(): string {
  return envOrThrow("GOOGLE_CLIENT_ID");
}

export function googleClientSecret(): string {
  return envOrThrow("GOOGLE_CLIENT_SECRET");
}

export function googleRedirectUri(): string {
  return process.env.GOOGLE_REDIRECT_URI ?? "http://localhost:3000/api/google-calendar/callback";
}

export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/** Build the consent-screen URL with our scopes + state for CSRF guard. */
export function buildAuthorizeUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: googleClientId(),
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    // `access_type=offline` + `prompt=consent` together guarantee a
    // refresh token. Without prompt=consent, Google only returns one
    // on the very first consent ever for that client+user pair.
    access_type: "offline",
    prompt: "consent",
    scope: SCOPES.join(" "),
    state,
    include_granted_scopes: "true",
  });
  return `${GOOGLE_OAUTH_BASE}?${params.toString()}`;
}

type TokenResponse = {
  access_token: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  token_type: string;
};

/** Exchange the auth code from the callback for tokens. */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    code,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    redirect_uri: googleRedirectUri(),
    grant_type: "authorization_code",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token exchange failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: googleClientId(),
    client_secret: googleClientSecret(),
    grant_type: "refresh_token",
  });
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google token refresh failed (${res.status}): ${text}`);
  }
  return (await res.json()) as TokenResponse;
}

/** Fetch the connected account's email — used to label the connection. */
export async function fetchUserEmail(accessToken: string): Promise<string | null> {
  const res = await fetch(GOOGLE_USERINFO_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email ?? null;
}

/**
 * Persist tokens after the OAuth callback. If `email` isn't supplied
 * we look it up from the userinfo endpoint so the UI can show which
 * Google account is connected.
 */
export async function saveTokens(
  userId: string,
  tokens: TokenResponse,
  emailFromCallback?: string | null,
): Promise<void> {
  const email = emailFromCallback ?? (await fetchUserEmail(tokens.access_token));
  const expiry = new Date(Date.now() + (tokens.expires_in - 30) * 1000);

  await db
    .insert(schema.googleCalendarTokens)
    .values({
      userId,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token ?? null,
      scope: tokens.scope,
      tokenType: tokens.token_type,
      expiry,
      email,
    })
    .onConflictDoUpdate({
      target: schema.googleCalendarTokens.userId,
      set: {
        accessToken: tokens.access_token,
        // Only overwrite the refresh token when Google actually returned
        // a new one. The refresh-token endpoint typically doesn't.
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        scope: tokens.scope,
        tokenType: tokens.token_type,
        expiry,
        email,
        updatedAt: new Date(),
      },
    });
}

/**
 * Read tokens, refreshing if expired. Returns null when the user has
 * never connected (caller should render the connection prompt). Pass
 * `{ force: true }` to refresh regardless of local expiry — used to
 * recover when Google rejects a token we still considered live (e.g.
 * the user revoked access externally, or our clock drifted).
 */
async function getValidAccessToken(
  userId: string,
  opts: { force?: boolean } = {},
): Promise<{
  accessToken: string;
  email: string | null;
  scope: string;
} | null> {
  const rows = await db
    .select()
    .from(schema.googleCalendarTokens)
    .where(eq(schema.googleCalendarTokens.userId, userId))
    .limit(1);
  const row = rows[0];
  if (!row) return null;

  // Live token still valid? Use as-is — unless the caller is asking
  // for a forced refresh after Google rejected the cached token.
  if (!opts.force && row.expiry.getTime() > Date.now()) {
    return { accessToken: row.accessToken, email: row.email, scope: row.scope };
  }

  // Need to refresh — but we can only do that if we have a refresh
  // token. If we don't, the user has to reconnect.
  if (!row.refreshToken) {
    throw new Error("Google Calendar session expired — please reconnect.");
  }

  const refreshed = await refreshAccessToken(row.refreshToken);
  await saveTokens(userId, refreshed, row.email);
  return {
    accessToken: refreshed.access_token,
    email: row.email,
    scope: refreshed.scope,
  };
}

/**
 * Make an authed Google API call, retrying once with a freshly
 * refreshed access token if Google answers 401. This rescues the case
 * where the cached token is "still valid" by our clock but has been
 * revoked or otherwise invalidated server-side.
 */
async function googleFetch(
  userId: string,
  buildRequest: (accessToken: string) => Promise<Response>,
): Promise<Response> {
  const session = await getValidAccessToken(userId);
  if (!session) {
    throw new Error("not connected to google calendar.");
  }
  const res = await buildRequest(session.accessToken);
  if (res.status !== 401) return res;

  const refreshed = await getValidAccessToken(userId, { force: true });
  if (!refreshed) return res;
  return buildRequest(refreshed.accessToken);
}

/* ─── calendar list ─────────────────────────────────────────────── */

type RawCalendar = {
  id: string;
  summary: string;
  description?: string;
  backgroundColor?: string;
  foregroundColor?: string;
  primary?: boolean;
  selected?: boolean;
  accessRole: string;
};

export async function listCalendars(userId: string): Promise<{
  email: string | null;
  scope: string;
  calendars: Calendar[];
} | null> {
  const session = await getValidAccessToken(userId);
  if (!session) return null;

  const res = await googleFetch(userId, (token) =>
    fetch(`${GOOGLE_API_BASE}/users/me/calendarList?maxResults=250`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  );
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Google calendarList failed (${res.status}): ${text}`);
  }
  const data = (await res.json()) as { items?: RawCalendar[] };
  const calendars: Calendar[] = (data.items ?? []).map((c) => ({
    id: c.id,
    summary: c.summary,
    description: c.description ?? null,
    backgroundColor: c.backgroundColor ?? "#3f51b5",
    foregroundColor: c.foregroundColor ?? "#ffffff",
    primary: Boolean(c.primary),
    selected: c.selected ?? false,
    accessRole: c.accessRole,
  }));

  // Sort: primary first, then by display name.
  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (b.primary && !a.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });

  return { email: session.email, scope: session.scope, calendars };
}

/* ─── events ────────────────────────────────────────────────────── */

type RawEvent = {
  id: string;
  summary?: string;
  description?: string;
  location?: string;
  htmlLink: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status: string;
  organizer?: { email?: string };
  hangoutLink?: string;
  colorId?: string;
  visibility?: string;
  transparency?: string;
  reminders?: {
    useDefault?: boolean;
    overrides?: { method?: string; minutes?: number }[];
  };
};

function shape(raw: RawEvent, calendar: Calendar): CalendarEvent {
  const isAllDay = !raw.start.dateTime;
  const canEdit = calendar.accessRole === "owner" || calendar.accessRole === "writer";
  const visibility = (raw.visibility as EventVisibility) ?? "default";
  const transparency = (raw.transparency as EventTransparency) ?? "opaque";
  const remindersUseDefault = raw.reminders?.useDefault ?? true;
  const reminders: EventReminder[] = (raw.reminders?.overrides ?? [])
    .filter((r) => (r.method === "popup" || r.method === "email") && typeof r.minutes === "number")
    .map((r) => ({ method: r.method as "popup" | "email", minutes: r.minutes! }));
  return {
    id: `${calendar.id}::${raw.id}`,
    googleEventId: raw.id,
    summary: raw.summary ?? null,
    description: raw.description ?? null,
    location: raw.location ?? null,
    htmlLink: raw.htmlLink,
    start: raw.start.dateTime ?? raw.start.date!,
    end: raw.end.dateTime ?? raw.end.date!,
    isAllDay,
    status: raw.status,
    organizerEmail: raw.organizer?.email ?? null,
    hangoutLink: raw.hangoutLink ?? null,
    colorId: raw.colorId ?? null,
    calendarId: calendar.id,
    calendarName: calendar.summary,
    calendarColor: calendar.backgroundColor,
    canEdit,
    visibility,
    transparency,
    remindersUseDefault,
    reminders,
  };
}

/**
 * Fetch events from a single calendar between `from` and `to`. Used
 * internally by the multi-calendar fetch.
 */
async function listEventsForCalendar(
  userId: string,
  calendar: Calendar,
  from: Date,
  to: Date,
  maxResults: number,
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({
    timeMin: from.toISOString(),
    timeMax: to.toISOString(),
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: String(maxResults),
  });
  const res = await googleFetch(userId, (token) =>
    fetch(`${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendar.id)}/events?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    }),
  );
  if (!res.ok) {
    // Don't throw — one busted calendar shouldn't kill the whole view.
    return [];
  }
  const data = (await res.json()) as { items?: RawEvent[] };
  return (data.items ?? []).map((r) => shape(r, calendar));
}

/**
 * Fetch events between `from` and `to` from every calendar the user
 * has marked as `selected` in Google. Calendars are fanned out in
 * parallel and the merged list is returned sorted by start.
 *
 * If the user has no selected calendars, falls back to every calendar
 * the user can read so the UI never appears empty by accident.
 */
export async function listEvents(
  userId: string,
  from: Date,
  to: Date,
  maxResultsPerCalendar = 100,
): Promise<{
  email: string | null;
  scope: string;
  calendars: Calendar[];
  events: CalendarEvent[];
} | null> {
  const session = await getValidAccessToken(userId);
  if (!session) return null;

  // Fetch the calendar list first so we know which IDs to hit + can
  // attach calendar metadata to each event.
  const list = await listCalendars(userId);
  if (!list) return null;

  let active = list.calendars.filter((c) => c.selected);
  if (active.length === 0) active = list.calendars;

  const perCalendar = await Promise.all(
    active.map((cal) => listEventsForCalendar(userId, cal, from, to, maxResultsPerCalendar)),
  );
  const events = perCalendar.flat().sort((a, b) => {
    const ta = new Date(a.start).getTime();
    const tb = new Date(b.start).getTime();
    return ta - tb;
  });

  return {
    email: session.email,
    scope: session.scope,
    calendars: list.calendars,
    events,
  };
}

/* ─── event creation ─────────────────────────────────────────────── */

export type CreateEventInput = {
  calendarId: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  /** ISO datetime — required when not all-day. */
  startDateTime?: string;
  endDateTime?: string;
  /** yyyy-mm-dd — required when all-day. */
  startDate?: string;
  endDate?: string;
  isAllDay: boolean;
  /** IANA timezone — defaults to user's browser zone. */
  timezone?: string;
};

export async function createEvent(
  userId: string,
  input: CreateEventInput,
): Promise<{ ok: true; htmlLink: string } | { ok: false; error: string }> {
  const session = await getValidAccessToken(userId);
  if (!session) return { ok: false, error: "not connected to google calendar." };
  if (!canWriteEvents(session.scope)) {
    return {
      ok: false,
      error: "current session has no write permission — click reconnect to update scopes.",
    };
  }

  // Build the request body — Google distinguishes timed vs all-day
  // events by which date field is set.
  let start: { dateTime?: string; date?: string; timeZone?: string };
  let end: { dateTime?: string; date?: string; timeZone?: string };
  if (input.isAllDay) {
    if (!input.startDate || !input.endDate) {
      return { ok: false, error: "start and end dates are required." };
    }
    start = { date: input.startDate };
    end = { date: input.endDate };
  } else {
    if (!input.startDateTime || !input.endDateTime) {
      return { ok: false, error: "start and end times are required." };
    }
    const tz = input.timezone ?? "UTC";
    start = { dateTime: input.startDateTime, timeZone: tz };
    end = { dateTime: input.endDateTime, timeZone: tz };
  }

  const body: Record<string, unknown> = {
    summary: input.summary,
    start,
    end,
  };
  if (input.description) body.description = input.description;
  if (input.location) body.location = input.location;

  const res = await googleFetch(userId, (token) =>
    fetch(`${GOOGLE_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    }),
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `google rejected the create (${res.status}): ${text}` };
  }
  const data = (await res.json()) as { htmlLink?: string };
  return { ok: true, htmlLink: data.htmlLink ?? "" };
}

/* ─── event update / delete ─────────────────────────────────────── */

export type UpdateEventInput = {
  calendarId: string;
  eventId: string;
  summary: string;
  description?: string | null;
  location?: string | null;
  startDateTime?: string;
  endDateTime?: string;
  startDate?: string;
  endDate?: string;
  isAllDay: boolean;
  timezone?: string;
  /** Per-event color id (1-11). Empty string / null clears the
   *  override and lets the calendar's color show through. */
  colorId?: string | null;
  visibility?: EventVisibility;
  transparency?: EventTransparency;
  /** When omitted, reminders are left untouched. When supplied, the
   *  override list replaces whatever the event had. */
  reminders?: { useDefault: boolean; overrides: EventReminder[] };
};

/**
 * Patch the event with the supplied fields. We use PATCH (not PUT) so
 * fields the user didn't touch (attendees, recurrence, reminders…)
 * stay intact. Calendar moves aren't supported — Google requires a
 * separate `move` API call for that.
 */
export async function updateEvent(
  userId: string,
  input: UpdateEventInput,
): Promise<{ ok: true; htmlLink: string } | { ok: false; error: string }> {
  const session = await getValidAccessToken(userId);
  if (!session) return { ok: false, error: "not connected to google calendar." };
  if (!canWriteEvents(session.scope)) {
    return {
      ok: false,
      error: "session has no write permission — click reconnect.",
    };
  }

  let start: { dateTime?: string; date?: string; timeZone?: string };
  let end: { dateTime?: string; date?: string; timeZone?: string };
  if (input.isAllDay) {
    if (!input.startDate || !input.endDate) {
      return { ok: false, error: "start and end dates are required." };
    }
    start = { date: input.startDate };
    end = { date: input.endDate };
  } else {
    if (!input.startDateTime || !input.endDateTime) {
      return { ok: false, error: "start and end times are required." };
    }
    const tz = input.timezone ?? "UTC";
    start = { dateTime: input.startDateTime, timeZone: tz };
    end = { dateTime: input.endDateTime, timeZone: tz };
  }

  const body: Record<string, unknown> = {
    summary: input.summary,
    description: input.description ?? "",
    location: input.location ?? "",
    start,
    end,
  };
  // colorId === "" means "clear the override"; null/undefined means "leave alone".
  if (input.colorId === "") body.colorId = null;
  else if (input.colorId) body.colorId = input.colorId;
  if (input.visibility) body.visibility = input.visibility;
  if (input.transparency) body.transparency = input.transparency;
  if (input.reminders) {
    body.reminders = {
      useDefault: input.reminders.useDefault,
      overrides: input.reminders.useDefault ? [] : input.reminders.overrides,
    };
  }

  const res = await googleFetch(userId, (token) =>
    fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(input.calendarId)}/events/${encodeURIComponent(input.eventId)}`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    ),
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `google rejected the update (${res.status}): ${text}` };
  }
  const data = (await res.json()) as { htmlLink?: string };
  return { ok: true, htmlLink: data.htmlLink ?? "" };
}

export async function deleteEvent(
  userId: string,
  calendarId: string,
  eventId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getValidAccessToken(userId);
  if (!session) return { ok: false, error: "not connected to google calendar." };
  if (!canWriteEvents(session.scope)) {
    return {
      ok: false,
      error: "session has no write permission — click reconnect.",
    };
  }
  const res = await googleFetch(userId, (token) =>
    fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
      {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  );
  // Google returns 204 No Content on success, or 410 Gone if already deleted.
  if (!res.ok && res.status !== 410) {
    const text = await res.text();
    return { ok: false, error: `google rejected the delete (${res.status}): ${text}` };
  }
  return { ok: true };
}

/**
 * Move an event from one calendar to another. Google requires a
 * dedicated `events.move` endpoint for this — PATCH cannot change the
 * containing calendar. The event id stays stable across the move.
 */
export async function moveEvent(
  userId: string,
  fromCalendarId: string,
  eventId: string,
  toCalendarId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const session = await getValidAccessToken(userId);
  if (!session) return { ok: false, error: "not connected to google calendar." };
  if (!canWriteEvents(session.scope)) {
    return {
      ok: false,
      error: "session has no write permission — click reconnect.",
    };
  }
  const params = new URLSearchParams({ destination: toCalendarId });
  const res = await googleFetch(userId, (token) =>
    fetch(
      `${GOOGLE_API_BASE}/calendars/${encodeURIComponent(fromCalendarId)}/events/${encodeURIComponent(eventId)}/move?${params}`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      },
    ),
  );
  if (!res.ok) {
    const text = await res.text();
    return { ok: false, error: `google rejected the move (${res.status}): ${text}` };
  }
  return { ok: true };
}

/** Drop the row entirely — the user explicitly disconnected. */
export async function clearTokens(userId: string): Promise<void> {
  await db
    .delete(schema.googleCalendarTokens)
    .where(eq(schema.googleCalendarTokens.userId, userId));
}

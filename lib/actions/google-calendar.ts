"use server";

import { revalidatePath } from "next/cache";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import {
  clearTokens,
  createEvent,
  deleteEvent,
  moveEvent,
  updateEvent,
  type CreateEventInput,
  type UpdateEventInput,
} from "@/lib/google-calendar";

export type GoogleCalendarActionResult = { ok: true } | { ok: false; error: string };

export type CreateEventActionResult = { ok: true; htmlLink: string } | { ok: false; error: string };

/**
 * Disconnect — drops the persisted tokens entirely. The user can
 * re-authorize from the calendar page if they change their mind.
 */
export async function disconnectGoogleCalendar(): Promise<GoogleCalendarActionResult> {
  const user = await requireUser();
  try {
    await clearTokens(user.id);
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "failed to disconnect" };
  }
  invalidate(TAGS.googleCalendarTokens);
  revalidatePath("/calendar");
  return { ok: true };
}

/**
 * Create a calendar event in the chosen calendar. Validates inputs +
 * forwards to Google. Returns the event's `htmlLink` on success so
 * the UI can offer a "open in google calendar" follow-up.
 */
export async function createGoogleCalendarEvent(
  input: CreateEventInput,
): Promise<CreateEventActionResult> {
  const user = await requireUser();

  if (!input.calendarId) return { ok: false, error: "select a calendar." };
  if (!input.summary || input.summary.trim() === "") {
    return { ok: false, error: "add a title." };
  }

  const result = await createEvent(user.id, {
    ...input,
    summary: input.summary.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
  });

  if (!result.ok) return result;

  invalidate(TAGS.googleCalendarTokens);
  revalidatePath("/calendar");
  return { ok: true, htmlLink: result.htmlLink };
}

/**
 * Patch an existing event. The synthetic `id` field on CalendarEvent
 * combines `${calendarId}::${eventId}` — the form passes both apart
 * via this input shape so the action can call the API directly.
 */
export async function updateGoogleCalendarEvent(
  input: UpdateEventInput,
): Promise<CreateEventActionResult> {
  const user = await requireUser();
  if (!input.calendarId || !input.eventId) {
    return { ok: false, error: "invalid event." };
  }
  if (!input.summary || input.summary.trim() === "") {
    return { ok: false, error: "add a title." };
  }

  const result = await updateEvent(user.id, {
    ...input,
    summary: input.summary.trim(),
    description: input.description?.trim() || null,
    location: input.location?.trim() || null,
  });
  if (!result.ok) return result;

  invalidate(TAGS.googleCalendarTokens);
  revalidatePath("/calendar");
  return { ok: true, htmlLink: result.htmlLink };
}

/**
 * Move an event between calendars. Google requires a separate API call
 * for this — `updateGoogleCalendarEvent` cannot change the containing
 * calendar. Callers typically run this *before* an update so subsequent
 * field edits hit the new calendar.
 */
export async function moveGoogleCalendarEvent(
  fromCalendarId: string,
  eventId: string,
  toCalendarId: string,
): Promise<GoogleCalendarActionResult> {
  const user = await requireUser();
  if (!fromCalendarId || !eventId || !toCalendarId) {
    return { ok: false, error: "invalid move." };
  }
  if (fromCalendarId === toCalendarId) return { ok: true };
  const result = await moveEvent(user.id, fromCalendarId, eventId, toCalendarId);
  if (!result.ok) return result;
  invalidate(TAGS.googleCalendarTokens);
  revalidatePath("/calendar");
  return { ok: true };
}

export async function deleteGoogleCalendarEvent(
  calendarId: string,
  eventId: string,
): Promise<GoogleCalendarActionResult> {
  const user = await requireUser();
  if (!calendarId || !eventId) {
    return { ok: false, error: "invalid event." };
  }
  const result = await deleteEvent(user.id, calendarId, eventId);
  if (!result.ok) return result;
  invalidate(TAGS.googleCalendarTokens);
  revalidatePath("/calendar");
  return { ok: true };
}

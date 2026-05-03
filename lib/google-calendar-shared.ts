/**
 * Client-safe Google Calendar types and constants. Lives in its own
 * module (without `server-only`) so client components — like the event
 * detail dialog's color picker — can import the palette and shared
 * type aliases without dragging in the server-only API helpers.
 */

export const GOOGLE_EVENT_COLORS: Record<string, { hex: string; name: string }> = {
  "1": { hex: "#7986cb", name: "lavender" },
  "2": { hex: "#33b679", name: "sage" },
  "3": { hex: "#8e24aa", name: "grape" },
  "4": { hex: "#e67c73", name: "flamingo" },
  "5": { hex: "#f6c026", name: "banana" },
  "6": { hex: "#f5511d", name: "tangerine" },
  "7": { hex: "#039be5", name: "peacock" },
  "8": { hex: "#616161", name: "graphite" },
  "9": { hex: "#3f51b5", name: "blueberry" },
  "10": { hex: "#0b8043", name: "basil" },
  "11": { hex: "#d50000", name: "tomato" },
};

export type EventReminder = {
  method: "popup" | "email";
  minutes: number;
};

export type EventVisibility = "default" | "public" | "private" | "confidential";
export type EventTransparency = "opaque" | "transparent";

export type Calendar = {
  id: string;
  summary: string;
  description: string | null;
  backgroundColor: string;
  foregroundColor: string;
  primary: boolean;
  selected: boolean;
  accessRole: string;
};

export type CalendarEvent = {
  id: string;
  googleEventId: string;
  summary: string | null;
  description: string | null;
  location: string | null;
  htmlLink: string;
  start: string;
  end: string;
  isAllDay: boolean;
  status: string;
  organizerEmail: string | null;
  hangoutLink: string | null;
  colorId: string | null;
  calendarId: string;
  calendarName: string;
  calendarColor: string;
  canEdit: boolean;
  visibility: EventVisibility;
  transparency: EventTransparency;
  remindersUseDefault: boolean;
  reminders: EventReminder[];
};

/**
 * Filter out Google's non-human "organizer" addresses. Group calendars
 * and imported calendars surface the calendar resource id as the
 * organizer.email (e.g. `xyz@group.calendar.google.com`), which is
 * meaningless to a human and produces visual clutter in the UI.
 */
export function isHumanEmail(email: string | null | undefined): email is string {
  if (!email) return false;
  const lower = email.toLowerCase();
  if (lower.endsWith("@group.calendar.google.com")) return false;
  if (lower.endsWith("@import.calendar.google.com")) return false;
  if (lower.endsWith(".calendar.google.com")) return false;
  return true;
}

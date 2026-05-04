"use client";

import {
  Bell,
  BellOff,
  CalendarCheck,
  ExternalLink,
  Eye,
  EyeOff,
  Lock,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  deleteGoogleCalendarEvent,
  moveGoogleCalendarEvent,
  updateGoogleCalendarEvent,
} from "@/lib/actions/google-calendar";
import {
  GOOGLE_EVENT_COLORS,
  isHumanEmail,
  type Calendar,
  type CalendarEvent,
  type EventReminder,
  type EventTransparency,
  type EventVisibility,
} from "@/lib/google-calendar-shared";
import { cn } from "@/lib/utils";

type Props = {
  event: CalendarEvent | null;
  /** Full calendar list — used to populate the "move event" select.
   *  The dialog filters this down to writable calendars internally. */
  calendars: Calendar[];
  onClose: () => void;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

function splitIso(iso: string): { date: string; time: string } {
  if (!iso.includes("T")) {
    return { date: iso.slice(0, 10), time: "" };
  }
  const d = new Date(iso);
  const date = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { date, time };
}

function shiftAllDayEnd(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function formatDateTimeLong(event: CalendarEvent): string {
  if (event.isAllDay) {
    const start = new Date(event.start.slice(0, 10) + "T12:00:00");
    const inclusiveEnd = shiftAllDayEnd(event.end, -1);
    if (event.start.slice(0, 10) === inclusiveEnd) {
      return `${formatDate(start)} · all day`;
    }
    const end = new Date(inclusiveEnd + "T12:00:00");
    return `${formatDate(start)} → ${formatDate(end)} · all day`;
  }
  const start = new Date(event.start);
  const end = new Date(event.end);
  const sameDay =
    start.getFullYear() === end.getFullYear() &&
    start.getMonth() === end.getMonth() &&
    start.getDate() === end.getDate();
  if (sameDay) {
    return `${formatDate(start)} · ${formatTime(start)} → ${formatTime(end)}`;
  }
  return `${formatDate(start)} ${formatTime(start)} → ${formatDate(end)} ${formatTime(end)}`;
}

function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "2-digit",
  })
    .format(d)
    .toLowerCase();
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

/* ── small subcomponents ─────────────────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-muted-foreground/85 font-mono text-[10.5px] tracking-[0.16em] uppercase">
      {children}
    </span>
  );
}

function DateTimeRow({
  label,
  idDate,
  idTime,
  date,
  time,
  onDateChange,
  onTimeChange,
  isAllDay,
  disabled,
  minDate,
}: {
  label: string;
  idDate: string;
  idTime: string;
  date: string;
  time: string;
  onDateChange: (v: string) => void;
  onTimeChange: (v: string) => void;
  isAllDay: boolean;
  disabled: boolean;
  minDate?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label
        htmlFor={idDate}
        className="text-muted-foreground/85 w-12 shrink-0 font-mono text-[10.5px] tracking-[0.16em] uppercase"
      >
        {label}
      </label>
      <Input
        id={idDate}
        type="date"
        value={date}
        onChange={(e) => onDateChange(e.target.value)}
        disabled={disabled}
        min={minDate}
        className="h-10 min-w-[150px] flex-1"
      />
      {!isAllDay && (
        <Input
          id={idTime}
          type="time"
          value={time}
          onChange={(e) => onTimeChange(e.target.value)}
          disabled={disabled}
          className="h-10 w-[110px] shrink-0"
        />
      )}
    </div>
  );
}

/** Color swatch row — first chip is "default" (clear override). */
function ColorPicker({
  value,
  onChange,
  fallbackColor,
  disabled,
}: {
  value: string | null;
  onChange: (next: string | null) => void;
  fallbackColor: string;
  disabled: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(null)}
        disabled={disabled}
        title="use calendar color"
        aria-label="use calendar color"
        className={cn(
          "relative inline-flex size-7 items-center justify-center rounded-full border-2 transition-all",
          value === null
            ? "border-foreground/80 ring-2 ring-offset-2 ring-offset-background ring-foreground/20"
            : "border-border hover:border-foreground/40",
        )}
        style={{ backgroundColor: fallbackColor }}
      >
        <span className="text-[8px] font-medium text-white drop-shadow-sm">def</span>
      </button>
      {Object.entries(GOOGLE_EVENT_COLORS).map(([id, { hex, name }]) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          disabled={disabled}
          title={name}
          aria-label={name}
          className={cn(
            "size-7 rounded-full border-2 transition-all",
            value === id
              ? "border-foreground/80 ring-2 ring-offset-2 ring-offset-background ring-foreground/20"
              : "border-transparent hover:border-foreground/30",
          )}
          style={{ backgroundColor: hex }}
        />
      ))}
    </div>
  );
}

/** Reminders editor — useDefault toggle + editable override list. */
function RemindersEditor({
  useDefault,
  reminders,
  onUseDefaultChange,
  onChange,
  disabled,
}: {
  useDefault: boolean;
  reminders: EventReminder[];
  onUseDefaultChange: (v: boolean) => void;
  onChange: (next: EventReminder[]) => void;
  disabled: boolean;
}) {
  function update(idx: number, patch: Partial<EventReminder>) {
    onChange(reminders.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  }
  function remove(idx: number) {
    onChange(reminders.filter((_, i) => i !== idx));
  }
  function add() {
    onChange([...reminders, { method: "popup", minutes: 10 }]);
  }

  return (
    <div className="border-border bg-muted/10 flex flex-col gap-3 rounded-md border p-3">
      <label className="flex cursor-pointer items-center gap-2.5">
        <input
          type="checkbox"
          checked={useDefault}
          onChange={(e) => onUseDefaultChange(e.target.checked)}
          disabled={disabled}
          className="border-input size-4 rounded border accent-current"
        />
        <span className="text-foreground inline-flex items-center gap-1.5 text-[13px] font-medium">
          <Bell aria-hidden className="size-3.5" strokeWidth={1.6} />
          use calendar's default reminders
        </span>
      </label>

      {!useDefault && (
        <div className="flex flex-col gap-2">
          {reminders.length === 0 && (
            <span className="text-muted-foreground/70 inline-flex items-center gap-1.5 text-[12px]">
              <BellOff aria-hidden className="size-3.5" strokeWidth={1.6} />
              no reminders
            </span>
          )}
          {reminders.map((r, i) => (
            <div key={i} className="flex items-center gap-2">
              <Select
                value={r.method}
                onValueChange={(v) =>
                  v && update(i, { method: v as "popup" | "email" })
                }
                disabled={disabled}
                items={{ popup: "popup", email: "email" }}
              >
                <SelectTrigger className="h-9 w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popup">popup</SelectItem>
                  <SelectItem value="email">email</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={0}
                max={40320}
                value={r.minutes}
                onChange={(e) =>
                  update(i, { minutes: Math.max(0, Number(e.target.value) || 0) })
                }
                disabled={disabled}
                className="h-9 w-[90px]"
              />
              <span className="text-muted-foreground text-[12px]">min before</span>
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label="remove reminder"
                className="text-muted-foreground hover:text-destructive ml-auto inline-flex size-7 items-center justify-center rounded-md transition-colors"
              >
                <X aria-hidden className="size-3.5" strokeWidth={1.8} />
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={add}
            disabled={disabled || reminders.length >= 5}
            className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-dashed px-3 text-[12px] transition-colors disabled:opacity-50"
          >
            <Plus aria-hidden className="size-3" strokeWidth={1.8} />
            add reminder
          </button>
        </div>
      )}
    </div>
  );
}

/* ── main dialog ─────────────────────────────────────────────────── */

export function EventDetailDialog({ event, calendars, onClose }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [isSaving, startSaveTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();

  // Form state
  const [calendarId, setCalendarId] = useState("");
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [colorId, setColorId] = useState<string | null>(null);
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endDate, setEndDate] = useState("");
  const [endTime, setEndTime] = useState("");
  const [visibility, setVisibility] = useState<EventVisibility>("default");
  const [transparency, setTransparency] = useState<EventTransparency>("opaque");
  const [remindersUseDefault, setRemindersUseDefault] = useState(true);
  const [reminders, setReminders] = useState<EventReminder[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!event) {
      setEditing(false);
      setError(null);
      return;
    }
    setCalendarId(event.calendarId);
    setSummary(event.summary ?? "");
    setDescription(event.description ?? "");
    setLocation(event.location ?? "");
    setColorId(event.colorId);
    setIsAllDay(event.isAllDay);
    if (event.isAllDay) {
      setStartDate(event.start.slice(0, 10));
      setEndDate(shiftAllDayEnd(event.end, -1));
      setStartTime("");
      setEndTime("");
    } else {
      const s = splitIso(event.start);
      const e = splitIso(event.end);
      setStartDate(s.date);
      setStartTime(s.time);
      setEndDate(e.date);
      setEndTime(e.time);
    }
    setVisibility(event.visibility);
    setTransparency(event.transparency);
    setRemindersUseDefault(event.remindersUseDefault);
    setReminders(event.reminders);
    setEditing(false);
    setError(null);
  }, [event]);

  if (!event) return null;

  const color = event.calendarColor;
  const canEdit = event.canEdit;
  const writableCalendars = calendars.filter(
    (c) => c.accessRole === "owner" || c.accessRole === "writer",
  );
  const movedToOther = calendarId !== event.calendarId;

  function handleSave() {
    if (!event) return;
    setError(null);
    const tz = browserTimezone();

    startSaveTransition(async () => {
      // 1. If the calendar changed, move first — Google requires a
      //    separate API call and the eventId stays stable across it.
      let activeCalendarId = event.calendarId;
      if (calendarId !== event.calendarId) {
        const moveResult = await moveGoogleCalendarEvent(
          event.calendarId,
          event.googleEventId,
          calendarId,
        );
        if (!moveResult.ok) {
          setError(moveResult.error);
          return;
        }
        activeCalendarId = calendarId;
      }

      // 2. Patch all the editable fields.
      const base = {
        calendarId: activeCalendarId,
        eventId: event.googleEventId,
        summary,
        description,
        location,
        // colorId: null = clear override; "" sentinel signals "clear"; an id sets it.
        colorId: colorId === null ? "" : colorId,
        visibility,
        transparency,
        reminders: {
          useDefault: remindersUseDefault,
          overrides: reminders,
        },
      };
      const payload = isAllDay
        ? {
            ...base,
            isAllDay: true as const,
            startDate,
            endDate: shiftAllDayEnd(endDate, 1),
          }
        : {
            ...base,
            isAllDay: false as const,
            startDateTime: `${startDate}T${startTime}:00`,
            endDateTime: `${endDate}T${endTime}:00`,
            timezone: tz,
          };

      const result = await updateGoogleCalendarEvent(payload);
      if (result.ok) {
        toast.success(movedToOther ? "event moved and updated." : "event updated.");
        router.refresh();
        onClose();
      } else {
        setError(result.error);
      }
    });
  }

  function handleDelete() {
    if (!event) return;
    startDeleteTransition(async () => {
      const result = await deleteGoogleCalendarEvent(
        event.calendarId,
        event.googleEventId,
      );
      if (result.ok) {
        toast.success("event deleted.");
        router.refresh();
        setConfirmDelete(false);
        onClose();
      } else {
        toast.error(result.error);
        setConfirmDelete(false);
      }
    });
  }

  return (
    <>
      <Dialog open={!!event} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader className="flex flex-row items-start justify-between gap-3 pr-8">
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <DialogTitle className="flex items-start gap-2.5 leading-tight">
                <span
                  aria-hidden
                  className="mt-1.5 size-3 shrink-0 rounded-full"
                  style={{ backgroundColor: color }}
                />
                <span className="font-display flex-1 text-[18px] leading-tight font-light italic tracking-tight">
                  {editing ? "edit event" : event.summary ?? "(no title)"}
                </span>
              </DialogTitle>
              <DialogDescription className="ml-[22px] flex items-center gap-2 font-mono text-[10.5px] tracking-[0.14em] uppercase">
                <span className="truncate">{event.calendarName}</span>
                {!canEdit && (
                  <span className="text-muted-foreground/70 inline-flex shrink-0 items-center gap-1">
                    <Lock aria-hidden className="size-2.5" strokeWidth={1.8} />
                    read-only
                  </span>
                )}
              </DialogDescription>
            </div>

            {!editing && (
              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  onClick={() => window.open(event.htmlLink, "_blank")}
                  title="open in google calendar"
                  aria-label="open in google calendar"
                  className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-7 items-center justify-center rounded-md border transition-colors"
                >
                  <ExternalLink aria-hidden className="size-3" strokeWidth={1.6} />
                </button>
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    title="delete event"
                    aria-label="delete event"
                    className="border-border-strong text-muted-foreground hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive inline-flex size-7 items-center justify-center rounded-md border transition-colors"
                  >
                    <Trash2 aria-hidden className="size-3" strokeWidth={1.6} />
                  </button>
                )}
              </div>
            )}
          </DialogHeader>

          {editing ? (
            <FieldGroup className="gap-5">
              <Field>
                <FieldLabel htmlFor="ev-summary">title</FieldLabel>
                <Input
                  id="ev-summary"
                  value={summary}
                  onChange={(e) => setSummary(e.target.value)}
                  disabled={isSaving}
                  autoFocus
                  className="h-10"
                />
              </Field>

              {writableCalendars.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="ev-calendar">calendar</FieldLabel>
                  <Select
                    value={calendarId}
                    onValueChange={(v) => v && setCalendarId(v)}
                    disabled={isSaving}
                    items={Object.fromEntries(
                      writableCalendars.map((c) => [c.id, c.summary]),
                    )}
                  >
                    <SelectTrigger id="ev-calendar" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {writableCalendars.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <span className="flex items-center gap-2">
                            <span
                              aria-hidden
                              className="size-2.5 shrink-0 rounded-full"
                              style={{ backgroundColor: c.backgroundColor }}
                            />
                            {c.summary}
                            {c.primary && (
                              <span className="text-muted-foreground/60 text-[10px]">
                                primary
                              </span>
                            )}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {movedToOther && (
                    <FieldDescription>
                      the event will be moved to this calendar on save.
                    </FieldDescription>
                  )}
                </Field>
              )}

              <Field>
                <FieldLabel>event color</FieldLabel>
                <ColorPicker
                  value={colorId}
                  onChange={setColorId}
                  fallbackColor={color}
                  disabled={isSaving}
                />
              </Field>

              <Field>
                <label className="border-border bg-muted/20 hover:bg-muted/30 flex cursor-pointer items-center gap-2.5 rounded-md border px-3 py-2.5 transition-colors">
                  <input
                    type="checkbox"
                    checked={isAllDay}
                    onChange={(e) => setIsAllDay(e.target.checked)}
                    disabled={isSaving}
                    className="border-input size-4 rounded border accent-current"
                  />
                  <span className="text-foreground text-[13px] font-medium">
                    all day
                  </span>
                </label>
              </Field>

              <div className="border-border bg-muted/10 flex flex-col gap-3 rounded-md border p-3">
                <DateTimeRow
                  label="start"
                  idDate="ev-start-date"
                  idTime="ev-start-time"
                  date={startDate}
                  time={startTime}
                  onDateChange={setStartDate}
                  onTimeChange={setStartTime}
                  isAllDay={isAllDay}
                  disabled={isSaving}
                />
                <div className="border-border/60 border-t" aria-hidden />
                <DateTimeRow
                  label="end"
                  idDate="ev-end-date"
                  idTime="ev-end-time"
                  date={endDate}
                  time={endTime}
                  onDateChange={setEndDate}
                  onTimeChange={setEndTime}
                  isAllDay={isAllDay}
                  disabled={isSaving}
                  minDate={startDate}
                />
              </div>

              <Field>
                <FieldLabel htmlFor="ev-location">location</FieldLabel>
                <Input
                  id="ev-location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  disabled={isSaving}
                  className="h-10"
                  placeholder="optional"
                />
              </Field>

              <Field>
                <FieldLabel htmlFor="ev-description">description</FieldLabel>
                <textarea
                  id="ev-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isSaving}
                  rows={4}
                  placeholder="optional"
                  className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:ring-ring min-h-[80px] w-full resize-y rounded-md border px-3 py-2 text-[13px] leading-relaxed transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-50"
                />
              </Field>

              <Field>
                <FieldLabel>reminders</FieldLabel>
                <RemindersEditor
                  useDefault={remindersUseDefault}
                  reminders={reminders}
                  onUseDefaultChange={setRemindersUseDefault}
                  onChange={setReminders}
                  disabled={isSaving}
                />
              </Field>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="ev-visibility">
                    <span className="inline-flex items-center gap-1.5">
                      {visibility === "private" || visibility === "confidential" ? (
                        <EyeOff aria-hidden className="size-3.5" strokeWidth={1.6} />
                      ) : (
                        <Eye aria-hidden className="size-3.5" strokeWidth={1.6} />
                      )}
                      visibility
                    </span>
                  </FieldLabel>
                  <Select
                    value={visibility}
                    onValueChange={(v) => v && setVisibility(v as EventVisibility)}
                    disabled={isSaving}
                    items={{
                      default: "default",
                      public: "public",
                      private: "private",
                      confidential: "confidential",
                    }}
                  >
                    <SelectTrigger id="ev-visibility" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="default">default</SelectItem>
                      <SelectItem value="public">public</SelectItem>
                      <SelectItem value="private">private</SelectItem>
                      <SelectItem value="confidential">confidential</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="ev-transparency">availability</FieldLabel>
                  <Select
                    value={transparency}
                    onValueChange={(v) => v && setTransparency(v as EventTransparency)}
                    disabled={isSaving}
                    items={{ opaque: "busy", transparent: "free" }}
                  >
                    <SelectTrigger id="ev-transparency" className="h-10 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="opaque">busy</SelectItem>
                      <SelectItem value="transparent">free</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>

              <FieldDescription>timezone: {browserTimezone()}</FieldDescription>
              {error && <FieldError>{error}</FieldError>}
            </FieldGroup>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="border-border bg-muted/20 flex items-start gap-3 rounded-md border px-3 py-2.5">
                <CalendarCheck
                  aria-hidden
                  className="text-primary mt-0.5 size-4 shrink-0"
                  strokeWidth={1.6}
                />
                <div className="flex flex-1 flex-col gap-0.5">
                  <SectionLabel>when</SectionLabel>
                  <span className="text-foreground text-[13.5px]">
                    {formatDateTimeLong(event)}
                  </span>
                </div>
              </div>

              {(event.location || event.hangoutLink) && (
                <div className="flex flex-col gap-2">
                  {event.location && (
                    <div className="flex items-start gap-3 text-[13px]">
                      <MapPin
                        aria-hidden
                        className="text-muted-foreground/70 mt-0.5 size-4 shrink-0"
                        strokeWidth={1.6}
                      />
                      <span className="text-foreground break-words">
                        {event.location}
                      </span>
                    </div>
                  )}
                  {event.hangoutLink && (
                    <a
                      href={event.hangoutLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border-primary/40 bg-primary/[0.06] text-primary hover:bg-primary/[0.12] inline-flex w-fit items-center gap-2 rounded-md border px-3 py-1.5 text-[12.5px] font-medium transition-colors"
                    >
                      <Video aria-hidden className="size-3.5" strokeWidth={1.7} />
                      join google meet
                    </a>
                  )}
                </div>
              )}

              {event.description && (
                <div className="border-border/50 flex flex-col gap-1.5 border-t pt-3">
                  <SectionLabel>notes</SectionLabel>
                  <p className="text-foreground/90 text-[12.5px] leading-relaxed break-words whitespace-pre-wrap">
                    {event.description}
                  </p>
                </div>
              )}

              {/* Quick-glance meta row — visibility / busy state / reminders.
                  Only renders when at least one is non-default so the dialog
                  stays calm by default. */}
              {(event.visibility !== "default" ||
                event.transparency !== "opaque" ||
                !event.remindersUseDefault) && (
                <div className="border-border/50 flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t pt-3 text-[11.5px]">
                  {event.visibility !== "default" && (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                      <EyeOff aria-hidden className="size-3" strokeWidth={1.7} />
                      {event.visibility}
                    </span>
                  )}
                  {event.transparency === "transparent" && (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                      show as free
                    </span>
                  )}
                  {!event.remindersUseDefault && (
                    <span className="text-muted-foreground inline-flex items-center gap-1.5">
                      <Bell aria-hidden className="size-3" strokeWidth={1.7} />
                      {event.reminders.length === 0
                        ? "no reminders"
                        : event.reminders
                            .map((r) => `${r.minutes}m ${r.method}`)
                            .join(" · ")}
                    </span>
                  )}
                </div>
              )}

              {isHumanEmail(event.organizerEmail) && (
                <span className="text-muted-foreground/60 mt-1 font-mono text-[10px] tracking-wider break-all">
                  organized by {event.organizerEmail}
                </span>
              )}
            </div>
          )}

          <DialogFooter className="flex items-center gap-2">
            {editing ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditing(false)}
                  disabled={isSaving}
                >
                  <X aria-hidden className="size-3.5" />
                  cancel
                </Button>
                <Button type="button" onClick={handleSave} disabled={isSaving || !summary.trim()}>
                  <Save aria-hidden className="size-3.5" />
                  {isSaving ? "saving..." : "save"}
                </Button>
              </>
            ) : (
              <Button
                type="button"
                onClick={() => setEditing(true)}
                disabled={!canEdit}
                className="ml-auto"
              >
                <Pencil aria-hidden className="size-3.5" />
                edit event
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              {`"${event.summary ?? "(no title)"}" will be permanently removed from google calendar.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={isDeleting}
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
            >
              {isDeleting ? "deleting..." : "delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

"use client";

import {
  AlertCircle,
  Calendar as CalendarIcon,
  CalendarPlus,
  CheckCircle2,
  Link2,
  Loader2,
  LogOut,
  MapPin,
  Plug,
  Plug2,
  RefreshCcw,
  ShieldCheck,
  Video,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { toast } from "sonner";

import { EditorialHero } from "@/components/dashboard/editorial-hero";
import { PageShell } from "@/components/dashboard/page-shell";
import { Button } from "@/components/ui/button";
import { disconnectGoogleCalendar } from "@/lib/actions/google-calendar";
import type { Calendar, CalendarEvent } from "@/lib/google-calendar";
import type { GoogleCalendarConnection } from "@/lib/queries/google-calendar";
import { cn } from "@/lib/utils";

import { CreateEventDialog } from "./create-event-dialog";
import { EventDetailDialog } from "./event-detail-dialog";
import { WeekView } from "./week-view";

type Props = {
  connection: GoogleCalendarConnection;
  upcoming: {
    email: string | null;
    calendars: Calendar[];
    events: CalendarEvent[];
    canWrite: boolean;
  } | null;
  fetchError: string | null;
  callbackError: string | null;
  justConnected: boolean;
};

export function CalendarPage({
  connection,
  upcoming,
  fetchError,
  callbackError,
  justConnected,
}: Props) {
  const router = useRouter();
  const [isDisconnecting, startDisconnectTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  // Hidden calendars (toggled off via the chip strip). Default = all
  // visible. Stored as a Set of calendar ids for O(1) lookup in the
  // event filter.
  const [hiddenCalendarIds, setHiddenCalendarIds] = useState<Set<string>>(
    () => new Set(),
  );

  // Surface OAuth callback errors as a toast once on mount.
  useEffect(() => {
    if (callbackError) {
      toast.error(decodeError(callbackError));
      // Strip the query string so a refresh doesn't re-toast.
      window.history.replaceState({}, "", "/calendar");
    } else if (justConnected) {
      toast.success("google calendar connected.");
      window.history.replaceState({}, "", "/calendar");
    }
  }, [callbackError, justConnected]);

  function handleDisconnect() {
    if (!window.confirm("desconectar o google calendar?")) return;
    startDisconnectTransition(async () => {
      const result = await disconnectGoogleCalendar();
      if (result.ok) {
        toast.success("google calendar disconnected.");
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell
      title="calendar"
      subtitle="google calendar"
      toolbar={
        connection.connected ? (
          <div className="flex items-center gap-2">
            {upcoming?.canWrite && (
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <CalendarPlus aria-hidden className="size-3.5" strokeWidth={1.8} />
                new event
              </Button>
            )}
            <button
              type="button"
              onClick={() => router.refresh()}
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12.5px] transition-colors"
            >
              <RefreshCcw aria-hidden className="size-3.5" strokeWidth={1.6} />
              refresh
            </button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDisconnect}
              disabled={isDisconnecting}
              className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            >
              <LogOut aria-hidden className="size-3.5" />
              disconnect
            </Button>
          </div>
        ) : null
      }
    >
      <EditorialHero
        caption="schedule"
        title="calendar"
        accent="upcoming"
        subtitle="seus eventos do google calendar"
        tone="aqua"
      />

      {connection.connected ? (
        <ConnectedView
          email={connection.email}
          upcoming={upcoming}
          fetchError={fetchError}
          hiddenCalendarIds={hiddenCalendarIds}
          onToggleCalendar={(id) =>
            setHiddenCalendarIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            })
          }
          onEventClick={setSelectedEvent}
        />
      ) : (
        <DisconnectedView />
      )}

      {connection.connected && upcoming && (
        <CreateEventDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          calendars={upcoming.calendars}
        />
      )}
      {connection.connected && (
        <EventDetailDialog
          event={selectedEvent}
          calendars={upcoming?.calendars ?? []}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </PageShell>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function DisconnectedView() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 px-6 py-16 text-center">
      <div className="bg-primary/10 text-primary flex size-16 items-center justify-center rounded-full">
        <CalendarIcon className="size-7" strokeWidth={1.4} aria-hidden />
      </div>
      <div className="flex max-w-md flex-col gap-2">
        <h2 className="text-foreground text-[18px] font-medium">
          conecte seu google calendar
        </h2>
        <p className="text-muted-foreground text-[13px] leading-relaxed">
          autorize o moonbase a ler seus eventos do calendário principal. a leitura é
          read-only — não alteramos nada na sua agenda. você pode desconectar a
          qualquer momento.
        </p>
      </div>
      <a
        href="/api/google-calendar/start"
        className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-2 rounded-md px-4 text-[13px] font-medium transition-colors"
      >
        <Plug aria-hidden className="size-3.5" strokeWidth={1.8} />
        connect google calendar
      </a>
      <span className="text-muted-foreground/60 max-w-md font-mono text-[10.5px] tracking-wider">
        scopes: calendar.readonly · userinfo.email
      </span>
    </div>
  );
}

function ConnectedView({
  email,
  upcoming,
  fetchError,
  hiddenCalendarIds,
  onToggleCalendar,
  onEventClick,
}: {
  email: string | null;
  upcoming: {
    email: string | null;
    calendars: Calendar[];
    events: CalendarEvent[];
    canWrite: boolean;
  } | null;
  fetchError: string | null;
  hiddenCalendarIds: Set<string>;
  onToggleCalendar: (id: string) => void;
  onEventClick: (event: CalendarEvent) => void;
}) {
  const [view, setView] = useState<"week" | "agenda">("week");
  const allEvents = upcoming?.events ?? [];
  const calendars = upcoming?.calendars ?? [];
  const events = allEvents.filter((e) => !hiddenCalendarIds.has(e.calendarId));
  const grouped = groupByDay(events);

  return (
    <div className="flex flex-col gap-4 px-5 py-5">
      {/* Scope upgrade prompt — when the persisted scope doesn't grant
          event-write, surface a button to re-authorize so the user can
          create events from moonbase. */}
      {upcoming && !upcoming.canWrite && (
        <div className="border-amber-500/40 bg-amber-500/[0.06] text-amber-600 dark:text-amber-400 flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <div className="flex flex-1 flex-col gap-1">
            <span className="font-medium">permissão de escrita não concedida</span>
            <span className="text-amber-600/80 dark:text-amber-400/80 text-[11.5px]">
              sua sessão atual só permite leitura. clique em reconectar pra autorizar a criação de eventos.
            </span>
          </div>
          <a
            href="/api/google-calendar/start"
            className="text-amber-600 dark:text-amber-400 inline-flex shrink-0 items-center gap-1 self-center font-medium underline-offset-2 hover:underline"
          >
            reconectar →
          </a>
        </div>
      )}

      {/* Calendar legend — chips to toggle visibility per calendar.
          The view toggle (week/agenda) lives at the right end of this
          row so the old banner is gone and the chrome is one tidy line. */}
      {calendars.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-muted-foreground/70 mr-1 font-mono text-[10px] tracking-[0.16em] uppercase">
            calendars
          </span>
          {calendars.map((cal) => {
            const hidden = hiddenCalendarIds.has(cal.id);
            return (
              <button
                key={cal.id}
                type="button"
                onClick={() => onToggleCalendar(cal.id)}
                className={cn(
                  "border-border inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  hidden
                    ? "bg-muted/30 text-muted-foreground/50"
                    : "bg-card hover:bg-muted/40 text-foreground/85",
                )}
                title={hidden ? "show this calendar" : "hide this calendar"}
              >
                <span
                  aria-hidden
                  className={cn(
                    "size-2 shrink-0 rounded-full transition-opacity",
                    hidden && "opacity-30",
                  )}
                  style={{ backgroundColor: cal.backgroundColor }}
                />
                <span className={cn("truncate max-w-[160px]", hidden && "line-through")}>
                  {cal.summary}
                </span>
                {cal.primary && (
                  <span className="text-muted-foreground/60 font-mono text-[9px]">
                    primary
                  </span>
                )}
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-1">
            {(["week", "agenda"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={cn(
                  "rounded-md px-2.5 py-1 font-mono text-[10.5px] tracking-[0.14em] uppercase transition-colors",
                  view === v
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      {fetchError && (
        <div className="border-destructive/30 bg-destructive/5 text-destructive flex items-start gap-2 rounded-md border px-3 py-2 text-[12.5px]">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          <div className="flex flex-col gap-1">
            <span className="font-medium">erro ao buscar eventos</span>
            <span className="text-destructive/80 font-mono text-[11px]">{fetchError}</span>
            {fetchError.toLowerCase().includes("expired") && (
              <a
                href="/api/google-calendar/start"
                className="text-destructive font-medium underline-offset-2 hover:underline"
              >
                reconectar →
              </a>
            )}
          </div>
        </div>
      )}

      {events.length === 0 && !fetchError ? (
        <div className="flex h-[240px] flex-col items-center justify-center gap-2 px-6 text-center">
          <CalendarIcon
            className="text-muted-foreground/40 size-10"
            strokeWidth={1}
            aria-hidden
          />
          <p className="text-foreground text-[14px]">agenda livre por enquanto</p>
          <p className="text-muted-foreground/70 text-[12.5px]">
            quando você adicionar eventos no google calendar, eles aparecem aqui.
          </p>
        </div>
      ) : view === "week" ? (
        <WeekView events={events} onEventClick={onEventClick} />
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map(({ key, label, isToday, events: dayEvents }) => (
            <DayGroup
              key={key}
              label={label}
              isToday={isToday}
              events={dayEvents}
              onEventClick={onEventClick}
            />
          ))}
        </div>
      )}

      {/* Connection footer — discreet line at the very bottom. The big
          "connected" banner used to live up top; here it just whispers. */}
      <div className="border-border/60 text-muted-foreground/60 mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 border-t pt-3 font-mono text-[10px] tracking-[0.14em] uppercase">
        <Plug2 aria-hidden className="size-3" strokeWidth={1.6} />
        <span>connected</span>
        {email && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="normal-case tracking-normal">{email}</span>
          </>
        )}
        {upcoming?.canWrite && (
          <>
            <span className="text-muted-foreground/30">·</span>
            <span className="text-success/70 inline-flex items-center gap-1">
              <ShieldCheck aria-hidden className="size-3" strokeWidth={1.8} />
              read + write
            </span>
          </>
        )}
      </div>
    </div>
  );
}

function DayGroup({
  label,
  isToday,
  events,
  onEventClick,
}: {
  label: string;
  isToday: boolean;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}) {
  return (
    <section
      className={cn(
        "border-border overflow-hidden rounded-lg border",
        isToday && "border-primary/40 bg-primary/[0.025]",
      )}
    >
      <header
        className={cn(
          "border-border bg-muted/30 flex items-baseline justify-between border-b px-4 py-2.5",
          isToday && "border-primary/30 bg-primary/[0.06]",
        )}
      >
        <h3
          className={cn(
            "text-[13.5px] font-semibold tracking-tight",
            isToday ? "text-primary" : "text-foreground",
          )}
        >
          {label}
        </h3>
        <span className="text-muted-foreground/70 font-mono text-[10.5px] tabular-nums">
          {events.length} {events.length === 1 ? "event" : "events"}
        </span>
      </header>
      <ul className="divide-border divide-y">
        {events.map((event) => (
          <EventRow key={event.id} event={event} onClick={onEventClick} />
        ))}
      </ul>
    </section>
  );
}

function EventRow({
  event,
  onClick,
}: {
  event: CalendarEvent;
  onClick: (event: CalendarEvent) => void;
}) {
  return (
    <li
      className="hover:bg-muted/20 flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors"
      onClick={() => onClick(event)}
    >
      <div className="flex w-[64px] shrink-0 flex-col gap-0.5 pt-0.5">
        {event.isAllDay ? (
          <span className="text-muted-foreground font-mono text-[10.5px] tracking-wider uppercase">
            all day
          </span>
        ) : (
          <>
            <span className="text-foreground numeric text-[12.5px] font-medium tabular-nums">
              {formatTime(event.start)}
            </span>
            <span className="text-muted-foreground/70 numeric text-[11px] tabular-nums">
              {formatTime(event.end)}
            </span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">
        <span className="text-foreground inline-flex items-center gap-1.5 text-[13.5px] font-medium leading-tight">
          {event.summary ?? "(sem título)"}
        </span>
        {(event.location || event.hangoutLink) && (
          <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px]">
            {event.location && (
              <span className="inline-flex items-center gap-1">
                <MapPin
                  aria-hidden
                  className="text-muted-foreground/60 size-3 shrink-0"
                  strokeWidth={1.6}
                />
                <span className="truncate">{event.location}</span>
              </span>
            )}
            {event.hangoutLink && (
              <a
                href={event.hangoutLink}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="text-primary hover:text-primary/80 inline-flex items-center gap-1 underline-offset-2 hover:underline"
              >
                <Video
                  aria-hidden
                  className="size-3 shrink-0"
                  strokeWidth={1.6}
                />
                meet
              </a>
            )}
          </div>
        )}
        {event.organizerEmail && (
          <span className="text-muted-foreground/60 mt-1 inline-flex items-center gap-1 font-mono text-[10.5px]">
            <Link2
              aria-hidden
              className="size-2.5 shrink-0"
              strokeWidth={1.6}
            />
            {event.organizerEmail}
          </span>
        )}
      </div>
      {event.status === "tentative" && (
        <span className="text-muted-foreground/70 inline-flex items-center gap-1 self-start font-mono text-[9.5px] tracking-wider uppercase">
          <CheckCircle2
            aria-hidden
            className="size-3 shrink-0"
            strokeWidth={1.6}
          />
          tentative
        </span>
      )}
      {/* Suppress unused-component warning for the loader (kept for future use). */}
      <span className="hidden">
        <Loader2 aria-hidden className="size-0" />
      </span>
    </li>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

function decodeError(code: string): string {
  switch (code) {
    case "missing_code":
      return "google não retornou um código de autorização";
    case "invalid_state":
      return "estado de oauth inválido — tente novamente";
    case "access_denied":
      return "você cancelou a autorização";
    default:
      return code;
  }
}

function todayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Group events by their local-day key (yyyy-mm-dd). Returns the
 * groups in chronological order with display labels for the header.
 */
function groupByDay(events: CalendarEvent[]): Array<{
  key: string;
  label: string;
  isToday: boolean;
  events: CalendarEvent[];
}> {
  const today = todayKey();
  const map = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const key = event.start.slice(0, 10);
    const list = map.get(key);
    if (list) list.push(event);
    else map.set(key, [event]);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, list]) => ({
      key,
      label: formatDayLabel(key, today),
      isToday: key === today,
      events: list,
    }));
}

function formatDayLabel(iso: string, todayIso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  if (iso === todayIso) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
    })
      .format(date)
      .toLowerCase()
      .replace(/^\w+/, (w) => `today · ${w}`);
  }
  const tomorrowKey = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  if (iso === tomorrowKey) {
    return new Intl.DateTimeFormat("en-US", {
      weekday: "long",
      month: "short",
      day: "2-digit",
    })
      .format(date)
      .toLowerCase()
      .replace(/^\w+/, (w) => `tomorrow · ${w}`);
  }
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "short",
    day: "2-digit",
  })
    .format(date)
    .toLowerCase();
}

function formatTime(iso: string): string {
  // All-day events come as yyyy-mm-dd without a time component.
  if (!iso.includes("T")) return "—";
  const date = new Date(iso);
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

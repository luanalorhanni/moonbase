"use client";

import { CalendarPlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { createGoogleCalendarEvent } from "@/lib/actions/google-calendar";
import type { Calendar } from "@/lib/google-calendar";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  calendars: Calendar[];
  /** Pre-fill the date — passed from the week-view "click an empty slot" UX. */
  defaultDate?: Date | null;
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function todayLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function nextHourLocalIso(d: Date): { date: string; time: string } {
  const r = new Date(d);
  r.setMinutes(0, 0, 0);
  r.setHours(r.getHours() + 1);
  return {
    date: `${r.getFullYear()}-${pad(r.getMonth() + 1)}-${pad(r.getDate())}`,
    time: `${pad(r.getHours())}:${pad(r.getMinutes())}`,
  };
}

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function CreateEventDialog({ open, onOpenChange, calendars, defaultDate }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const writableCalendars = calendars.filter(
    (c) => c.accessRole === "owner" || c.accessRole === "writer",
  );
  const initialCalendarId =
    writableCalendars.find((c) => c.primary)?.id ?? writableCalendars[0]?.id ?? "";

  const start = defaultDate ? nextHourLocalIso(defaultDate) : nextHourLocalIso(new Date());
  const initialEnd = (() => {
    const d = new Date(`${start.date}T${start.time}:00`);
    d.setHours(d.getHours() + 1);
    return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  })();

  const [calendarId, setCalendarId] = useState(initialCalendarId);
  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isAllDay, setIsAllDay] = useState(false);
  const [startDate, setStartDate] = useState(start.date);
  const [startTime, setStartTime] = useState(start.time);
  const [endDate, setEndDate] = useState(start.date);
  const [endTime, setEndTime] = useState(initialEnd);
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    const tz = browserTimezone();
    const payload = isAllDay
      ? {
          calendarId,
          summary,
          description,
          location,
          isAllDay: true as const,
          startDate,
          // Google's all-day events are exclusive on the end date —
          // shift +1 so a single-day event has end = next day.
          endDate: addDaysIso(endDate, 1),
        }
      : {
          calendarId,
          summary,
          description,
          location,
          isAllDay: false as const,
          startDateTime: `${startDate}T${startTime}:00`,
          endDateTime: `${endDate}T${endTime}:00`,
          timezone: tz,
        };

    startTransition(async () => {
      const result = await createGoogleCalendarEvent(payload);
      if (result.ok) {
        toast.success("evento criado.");
        router.refresh();
        onOpenChange(false);
        // Reset for next open
        setSummary("");
        setDescription("");
        setLocation("");
      } else {
        setError(result.error);
      }
    });
  }

  if (writableCalendars.length === 0 && open) {
    // Edge case: user has no calendars they can write to. Render a
    // friendly empty state in the dialog.
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CalendarPlus aria-hidden className="size-4" strokeWidth={1.6} />
              novo evento
            </DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground py-4 text-[13px]">
            você não tem calendários com permissão de escrita. peça ao dono pra te dar
            acesso de "writer" ou crie um calendário próprio no google.
          </p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus aria-hidden className="size-4" strokeWidth={1.6} />
            novo evento
          </DialogTitle>
          <DialogDescription>
            criado direto no seu google calendar — aparece em todos os clientes.
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="ev-summary">título</FieldLabel>
            <Input
              id="ev-summary"
              placeholder="ex: reunião com a equipe"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              autoFocus
              disabled={isPending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ev-calendar">calendário</FieldLabel>
            <Select
              value={calendarId}
              onValueChange={(v) => setCalendarId(v ?? "")}
              disabled={isPending}
              items={Object.fromEntries(writableCalendars.map((c) => [c.id, c.summary]))}
            >
              <SelectTrigger id="ev-calendar" className="w-full">
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
                        <span className="text-muted-foreground/60 text-[10px]">primary</span>
                      )}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field>
            <label className="border-border bg-muted/20 flex cursor-pointer items-center gap-2.5 rounded-md border p-2.5">
              <input
                type="checkbox"
                checked={isAllDay}
                onChange={(e) => setIsAllDay(e.target.checked)}
                disabled={isPending}
                className="border-input size-4 rounded border accent-current"
              />
              <span className="text-foreground text-[13px] font-medium">o dia inteiro</span>
            </label>
          </Field>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="ev-start-date">início</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="ev-start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isPending}
                  min={todayLocalIso()}
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    disabled={isPending}
                    className="w-28"
                  />
                )}
              </div>
            </Field>
            <Field>
              <FieldLabel htmlFor="ev-end-date">fim</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="ev-end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isPending}
                  min={startDate}
                />
                {!isAllDay && (
                  <Input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    disabled={isPending}
                    className="w-28"
                  />
                )}
              </div>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="ev-location">local</FieldLabel>
            <Input
              id="ev-location"
              placeholder="opcional"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isPending}
            />
          </Field>

          <Field>
            <FieldLabel htmlFor="ev-description">descrição</FieldLabel>
            <Input
              id="ev-description"
              placeholder="opcional"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isPending}
            />
            <FieldDescription>
              fuso horário detectado: {browserTimezone()}
            </FieldDescription>
          </Field>

          {error && (
            <FieldError>{error}</FieldError>
          )}
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
          >
            cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isPending || !summary.trim()}>
            {isPending ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} aria-hidden />
            ) : (
              <CalendarPlus className="size-3.5" strokeWidth={1.8} aria-hidden />
            )}
            criar evento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

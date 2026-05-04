"use client";

import { CalendarCheck, Check, Flame } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { CategoryIcon } from "@/components/ui/category-icon";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setHabitLog } from "@/lib/actions/habits";
import type { HabitLogRow, HabitWithCategory } from "@/lib/queries/habits";
import { cn } from "@/lib/utils";

const EN_DAY_LONG = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];

function formatLong(iso: string): { weekday: string; date: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const weekday = EN_DAY_LONG[date.getDay()]!;
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "2-digit",
    year: "numeric",
  })
    .format(date)
    .toLowerCase();
  return { weekday, date: dateLabel };
}

type Props = {
  /** yyyy-mm-dd or null when closed. */
  dateIso: string | null;
  habits: HabitWithCategory[];
  /** Logs for the selected day, scoped to this user. */
  logsForDate: HabitLogRow[];
  todayIso: string;
  onClose: () => void;
};

export function DayEditorDialog({ dateIso, habits, logsForDate, todayIso, onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Track the rows we've optimistically toggled so the UI updates instantly
  // without waiting for a refresh round-trip.
  const [pendingDone, setPendingDone] = useState<Set<string>>(new Set());
  const [pendingUndone, setPendingUndone] = useState<Set<string>>(new Set());

  if (!dateIso) return null;

  const { weekday, date } = formatLong(dateIso);
  const isToday = dateIso === todayIso;
  const isFuture = dateIso > todayIso;

  // Build set of habit ids that have a log for this day from the server.
  const serverDone = new Set(logsForDate.map((l) => l.habitId));

  function isDone(habitId: string): boolean {
    if (pendingDone.has(habitId)) return true;
    if (pendingUndone.has(habitId)) return false;
    return serverDone.has(habitId);
  }

  // Show every habit regardless of created_at: the user may want to
  // backfill historical data for habits they only just created in the
  // app. The unique (habit_id, date) constraint protects against
  // duplicates either way.
  const active = habits.filter((h) => h.isActive);
  const archived = habits.filter((h) => !h.isActive);

  function toggle(habit: HabitWithCategory) {
    if (isFuture) return;
    const next = !isDone(habit.id);

    // Optimistic flag.
    if (next) {
      setPendingDone((s) => new Set([...s, habit.id]));
      setPendingUndone((s) => {
        const n = new Set(s);
        n.delete(habit.id);
        return n;
      });
    } else {
      setPendingUndone((s) => new Set([...s, habit.id]));
      setPendingDone((s) => {
        const n = new Set(s);
        n.delete(habit.id);
        return n;
      });
    }

    startTransition(async () => {
      const result = await setHabitLog(habit.id, dateIso!, next);
      if (result.ok) {
        // Refresh server data so the next render uses canonical state.
        // Optimistic flags will be cleared when the dialog re-renders with
        // fresh logsForDate.
        router.refresh();
      } else {
        // Roll back.
        if (next) {
          setPendingDone((s) => {
            const n = new Set(s);
            n.delete(habit.id);
            return n;
          });
        } else {
          setPendingUndone((s) => {
            const n = new Set(s);
            n.delete(habit.id);
            return n;
          });
        }
        toast.error(result.error);
      }
    });
  }

  const doneCount = active.filter((h) => isDone(h.id)).length;

  return (
    <Dialog
      open={dateIso !== null}
      onOpenChange={(open) => {
        if (!open) {
          setPendingDone(new Set());
          setPendingUndone(new Set());
          onClose();
        }
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarCheck aria-hidden className="size-4" strokeWidth={1.6} />
            <span className="font-display text-[20px] font-light tracking-tight italic">
              {weekday}
            </span>
            <span className="text-muted-foreground/80 font-mono text-[10.5px] tracking-[0.16em] uppercase">
              {isToday ? "today" : date}
            </span>
          </DialogTitle>
          <DialogDescription>
            {isFuture
              ? "you can't log future days yet — come back here when the day arrives."
              : `${doneCount} of ${active.length} done · click to toggle each.`}
          </DialogDescription>
        </DialogHeader>

        {active.length === 0 && archived.length === 0 ? (
          <p className="text-muted-foreground py-6 text-center text-[12.5px]">
            no habits existed on this day yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {active.map((h) => {
              const done = isDone(h.id);
              return (
                <HabitToggleRow
                  key={h.id}
                  habit={h}
                  done={done}
                  disabled={isFuture || isPending}
                  onToggle={() => toggle(h)}
                />
              );
            })}
            {archived.length > 0 && (
              <>
                <li className="text-muted-foreground/60 mt-2 px-1 font-mono text-[10px] tracking-[0.18em] uppercase">
                  archived
                </li>
                {archived.map((h) => (
                  <HabitToggleRow
                    key={h.id}
                    habit={h}
                    done={isDone(h.id)}
                    disabled={isFuture || isPending}
                    onToggle={() => toggle(h)}
                  />
                ))}
              </>
            )}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}

function HabitToggleRow({
  habit,
  done,
  disabled,
  onToggle,
}: {
  habit: HabitWithCategory;
  done: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={done}
        className={cn(
          "border-border bg-card hover:border-foreground/30 group flex w-full items-center gap-3 rounded-md border p-2.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50",
          done && "border-success/40 bg-success/[0.06]",
        )}
        style={
          done
            ? undefined
            : { borderColor: `color-mix(in oklab, ${habit.color} 25%, var(--border))` }
        }
      >
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-md border transition-all",
            done
              ? "border-success/50 bg-success/20 text-success-foreground"
              : "border-border group-hover:border-foreground/40 text-transparent",
          )}
        >
          <Check className="size-3.5" strokeWidth={2.5} />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex items-center gap-2">
            {habit.icon ? (
              <CategoryIcon icon={habit.icon} color={habit.color} size={12} />
            ) : (
              <span
                aria-hidden
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: habit.color }}
              />
            )}
            <span
              className={cn(
                "truncate text-[13px] font-medium",
                done && "text-muted-foreground decoration-muted-foreground/40 line-through",
              )}
            >
              {habit.name}
            </span>
          </div>
          {habit.categoryName && (
            <span className="text-muted-foreground text-[10.5px]">
              {habit.categoryName} ·{" "}
              {habit.schedule === "daily" ? "daily" : `${habit.targetPerWeek}× / week`}
            </span>
          )}
        </div>
        {/* Decorative streak hint stays subtle for the past-day editor. */}
        {done && <Flame aria-hidden className="text-primary/60 size-3 shrink-0" strokeWidth={2} />}
      </button>
    </li>
  );
}

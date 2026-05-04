"use client";

import { MOODS, type MoodLevel } from "@/lib/journal/mood";
import { cn } from "@/lib/utils";

/**
 * Inline 5-step mood selector — climatic icons in a row. Click an
 * icon to set; click the active one again to clear (so a user can
 * change their mind from "I tagged this 3" back to "no mood today").
 */
export function MoodPicker({
  value,
  onChange,
  disabled,
}: {
  value: MoodLevel | null;
  onChange: (next: MoodLevel | null) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {MOODS.map((m) => {
        const Icon = m.icon;
        const active = value === m.value;
        return (
          <button
            key={m.value}
            type="button"
            disabled={disabled}
            onClick={() => onChange(active ? null : m.value)}
            aria-pressed={active}
            aria-label={m.label}
            title={m.label}
            className={cn(
              "border-border flex h-12 w-14 flex-col items-center justify-center gap-1 rounded-lg border transition-all duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
              active
                ? "border-primary/60 bg-primary/[0.08] text-primary scale-[1.03]"
                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
              disabled && "opacity-50",
            )}
          >
            <Icon aria-hidden strokeWidth={1.5} className={cn("size-4", active ? m.color : "")} />
            <span className="font-mono text-[9px] tracking-[0.14em] uppercase">{m.label}</span>
          </button>
        );
      })}
    </div>
  );
}

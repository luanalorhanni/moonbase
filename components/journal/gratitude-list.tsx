"use client";

import { Heart, Plus, X } from "lucide-react";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const MIN_VISIBLE = 3;

/**
 * Editable list of gratitude items. The user can add as many as they
 * want (button "add reason"); empty rows are filtered out at
 * save time by the validation layer. Three rows are always visible
 * by default to nudge the "três motivos" prompt — extras render
 * lazily when the user starts typing in the bottom slot.
 */
export function GratitudeList({
  value,
  onChange,
  disabled,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  disabled?: boolean;
}) {
  // Pad to the minimum so the user always sees three blank slots at
  // start. Stored value remains exactly what was typed; padding lives
  // only in the rendered array below.
  const visible =
    value.length >= MIN_VISIBLE ? value : [...value, ...Array(MIN_VISIBLE - value.length).fill("")];

  function update(idx: number, next: string) {
    const arr = [...visible];
    arr[idx] = next;
    while (arr.length > MIN_VISIBLE && arr[arr.length - 1] === "") {
      arr.pop();
    }
    onChange(arr);
  }

  function remove(idx: number) {
    const arr = visible.filter((_, i) => i !== idx);
    while (arr.length < MIN_VISIBLE) arr.push("");
    onChange(arr);
  }

  function add() {
    onChange([...visible, ""]);
  }

  return (
    <div className="border-border bg-muted/10 flex flex-col gap-2 rounded-md border p-3">
      {visible.map((item, idx) => {
        const isExtra = idx >= MIN_VISIBLE;
        return (
          <div key={idx} className="flex items-center gap-2">
            <span
              aria-hidden
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                item.trim().length > 0
                  ? "bg-accent/15 text-accent"
                  : "bg-muted/40 text-muted-foreground/40",
              )}
            >
              <Heart
                className={cn("size-3.5 transition-all", item.trim().length > 0 && "fill-current")}
                strokeWidth={1.5}
              />
            </span>
            <Input
              value={item}
              onChange={(e) => update(idx, e.target.value)}
              disabled={disabled}
              placeholder={
                idx === 0
                  ? "e.g. the sun hit the window early"
                  : idx === 1
                    ? "e.g. my coffee was just right"
                    : idx === 2
                      ? "e.g. someone said something kind"
                      : "another reason…"
              }
              className="h-9 flex-1"
            />
            {isExtra && (
              <button
                type="button"
                onClick={() => remove(idx)}
                disabled={disabled}
                aria-label="remove reason"
                title="remove"
                className="text-muted-foreground/60 hover:text-destructive inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
              >
                <X aria-hidden className="size-3.5" strokeWidth={1.7} />
              </button>
            )}
          </div>
        );
      })}
      <button
        type="button"
        onClick={add}
        disabled={disabled}
        className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex h-8 w-fit items-center gap-1.5 rounded-md border border-dashed px-3 text-[12px] transition-colors disabled:opacity-50"
      >
        <Plus aria-hidden className="size-3" strokeWidth={1.8} />
        add reason
      </button>
    </div>
  );
}

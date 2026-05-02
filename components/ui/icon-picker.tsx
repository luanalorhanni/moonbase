"use client";

import { Search, X } from "lucide-react";
import { useId, useMemo, useState } from "react";

import { CATEGORY_ICONS, getCategoryIcon } from "@/lib/category-icons";
import { cn } from "@/lib/utils";

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

export function IconPicker({ id, value, onChange, disabled }: Props) {
  const nativeId = useId();
  const searchId = id ?? nativeId;
  const [query, setQuery] = useState("");

  const Selected = getCategoryIcon(value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORY_ICONS;
    return CATEGORY_ICONS.filter(
      (i) => i.name.includes(q) || i.label.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="border-border bg-card flex size-9 shrink-0 items-center justify-center rounded-md border"
        >
          {Selected ? (
            <Selected className="text-foreground size-4" strokeWidth={1.6} />
          ) : (
            <span className="text-muted-foreground/50 text-[10px]">none</span>
          )}
        </span>
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
          />
          <input
            id={searchId}
            type="text"
            value={query}
            disabled={disabled}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="search icons"
            className={cn(
              "border-input bg-transparent placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-full rounded-md border pr-8 pl-8 text-[13px] transition-colors focus-visible:ring-3 focus-visible:outline-none",
              disabled && "cursor-not-allowed opacity-50",
            )}
          />
          {value ? (
            <button
              type="button"
              onClick={() => onChange("")}
              disabled={disabled}
              aria-label="clear icon"
              className="text-muted-foreground/60 hover:text-foreground absolute top-1/2 right-2 -translate-y-1/2 transition-colors"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          ) : null}
        </div>
      </div>

      <div className="border-border bg-muted/20 grid max-h-44 grid-cols-9 gap-1 overflow-y-auto rounded-md border p-2">
        {filtered.map(({ name, label, Icon }) => {
          const active = value === name;
          return (
            <button
              key={name}
              type="button"
              disabled={disabled}
              onClick={() => onChange(name)}
              title={label}
              aria-label={label}
              aria-pressed={active}
              className={cn(
                "border-transparent hover:bg-card hover:border-border flex size-8 items-center justify-center rounded-md border transition-colors",
                active && "bg-card border-foreground/40 text-foreground",
                disabled && "cursor-not-allowed opacity-50",
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  active ? "text-foreground" : "text-muted-foreground",
                )}
                strokeWidth={1.6}
              />
            </button>
          );
        })}
        {filtered.length === 0 ? (
          <div className="text-muted-foreground/60 col-span-full px-2 py-4 text-center text-[11px]">
            no icons match.
          </div>
        ) : null}
      </div>
    </div>
  );
}

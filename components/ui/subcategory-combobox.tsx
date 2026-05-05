"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategoryIcon } from "@/components/ui/category-icon";
import { cn } from "@/lib/utils";
import type { SubcategoryWithCategory } from "@/lib/queries/categories";

type Props = {
  subcategories: SubcategoryWithCategory[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  id?: string;
};

function groupByCategory(subcategories: SubcategoryWithCategory[]) {
  const groups = new Map<string, { icon: string | null; items: SubcategoryWithCategory[] }>();
  for (const sub of subcategories) {
    if (!groups.has(sub.categoryName)) {
      groups.set(sub.categoryName, { icon: sub.categoryIcon, items: [] });
    }
    groups.get(sub.categoryName)!.items.push(sub);
  }
  return groups;
}

export function SubcategoryCombobox({ subcategories, value, onChange, disabled, id }: Props) {
  const [open, setOpen] = useState(false);

  const selected = subcategories.find((s) => s.id === value);
  const grouped = groupByCategory(subcategories);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        disabled={disabled}
        className={cn(
          "border-input bg-input focus-visible:ring-ring/50 focus-visible:border-ring flex h-9 w-full items-center justify-between rounded-lg border px-3 py-2 text-sm transition-colors outline-none focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50",
          !selected ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {selected ? (
          <span className="flex min-w-0 items-center gap-2 truncate">
            {selected.categoryIcon && <CategoryIcon icon={selected.categoryIcon} size={13} />}
            <span className="text-muted-foreground/60 shrink-0 text-[12px]">
              {selected.categoryName}
            </span>
            <span className="text-foreground/40 shrink-0">/</span>
            <span className="truncate">{selected.name}</span>
          </span>
        ) : (
          <span>search subcategory…</span>
        )}
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="search…" autoFocus />
          <CommandList>
            <CommandEmpty className="text-muted-foreground py-6 text-center text-[13px]">
              no subcategory found.
            </CommandEmpty>
            {[...grouped.entries()].map(([categoryName, { icon, items }]) => (
              <CommandGroup
                key={categoryName}
                heading={
                  <span className="flex items-center gap-1.5">
                    {icon && <CategoryIcon icon={icon} size={11} />}
                    {categoryName}
                  </span>
                }
              >
                {items.map((sub) => (
                  <CommandItem
                    key={sub.id}
                    value={`${categoryName} ${sub.name}`}
                    onSelect={() => {
                      onChange(sub.id);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === sub.id ? "opacity-100" : "opacity-0",
                      )}
                    />
                    {sub.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

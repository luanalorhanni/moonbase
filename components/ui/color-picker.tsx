"use client";

import { Pipette } from "lucide-react";
import { useId } from "react";

import { cn } from "@/lib/utils";

/**
 * Hex color picker. Renders a curated palette of preset swatches plus a
 * native color input + hex text field for custom values.
 *
 * Value is always a 7-char string starting with "#" (lowercase).
 */
// Nynatrema palette — five brand colors plus tints/shades within the same
// family so the quick-pick grid covers light, mid and deep tones without
// drifting into unrelated hues.
const PRESETS = [
  "#8be2e8", // electric aqua
  "#5bc4cc", // aqua deep
  "#7e82aa", // lavender grey
  "#5c5f87", // lavender deep
  "#a788a3", // dusty mauve
  "#8a6a85", // mauve deep
  "#d2af99", // desert sand
  "#b58d75", // sand deep
  "#38394e", // space indigo
  "#5a5d75", // soft slate
  "#b8bbd4", // pale lavender
  "#ede2d5", // warm cream
];

type Props = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
};

function normalize(value: string): string {
  let v = value.trim();
  if (!v.startsWith("#")) v = `#${v}`;
  return v.toLowerCase();
}

function isValidHex(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value);
}

export function ColorPicker({ id, value, onChange, disabled }: Props) {
  const nativeId = useId();
  const inputId = id ?? nativeId;
  const safeValue = isValidHex(value) ? value : "#7e82aa";

  function handleHexChange(raw: string) {
    const v = normalize(raw);
    onChange(v);
  }

  return (
    <div className="flex flex-col gap-2">
      {/* current swatch + hex input + native picker */}
      <div className="flex items-center gap-2">
        <label
          htmlFor={`${inputId}-native`}
          className={cn(
            "border-border bg-card relative flex size-9 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-md border transition-shadow",
            disabled ? "cursor-not-allowed opacity-50" : "hover:ring-ring/40 hover:ring-2",
          )}
          title="pick custom color"
        >
          <span
            aria-hidden
            className="absolute inset-1 rounded"
            style={{ backgroundColor: safeValue }}
          />
          <Pipette
            aria-hidden
            className="text-foreground/50 relative z-10 size-3 mix-blend-difference"
            strokeWidth={1.6}
          />
          <input
            id={`${inputId}-native`}
            type="color"
            value={safeValue}
            disabled={disabled}
            onChange={(e) => handleHexChange(e.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <input
          id={inputId}
          type="text"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => handleHexChange(e.target.value)}
          placeholder="#7e82aa"
          spellCheck={false}
          className={cn(
            "border-input placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/50 h-9 w-32 rounded-md border bg-transparent px-3 font-mono text-[12px] tabular-nums transition-colors focus-visible:ring-3 focus-visible:outline-none",
            disabled && "cursor-not-allowed opacity-50",
          )}
        />
        <span className="text-muted-foreground font-mono text-[10px] tracking-wider">hex</span>
      </div>

      {/* preset swatches */}
      <div className="grid grid-cols-6 gap-1.5">
        {PRESETS.map((preset) => {
          const active = preset.toLowerCase() === safeValue.toLowerCase();
          return (
            <button
              key={preset}
              type="button"
              disabled={disabled}
              onClick={() => onChange(preset)}
              aria-label={`use ${preset}`}
              aria-pressed={active}
              className={cn(
                "ring-border-strong relative size-7 rounded-md ring-1 transition-all",
                disabled ? "cursor-not-allowed opacity-50" : "hover:scale-110 hover:ring-2",
                active && "ring-foreground ring-[2px]",
              )}
              style={{ backgroundColor: preset }}
            />
          );
        })}
      </div>
    </div>
  );
}

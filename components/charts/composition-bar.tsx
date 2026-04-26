import { cn } from "@/lib/utils";

const CURRENCY = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  maximumFractionDigits: 0,
});

export type CompositionSegment = {
  key: string;
  label: string;
  value: number;
  /** stroke/fill token name; consumer maps to a tailwind class via the dict below */
  tone: "primary" | "muted" | "subtle";
};

const TONE_BG: Record<CompositionSegment["tone"], string> = {
  primary: "bg-primary/85",
  muted: "bg-foreground/35",
  subtle: "bg-foreground/15",
};

const TONE_DOT: Record<CompositionSegment["tone"], string> = {
  primary: "bg-primary/85",
  muted: "bg-foreground/35",
  subtle: "bg-foreground/15",
};

/**
 * A single segmented horizontal bar that shows how the whole splits into
 * parts. No axes, no grid — it's read like a typographic line. Companion
 * legend below preserves precise figures for the eye that wants them.
 */
export function CompositionBar({ segments }: { segments: CompositionSegment[] }) {
  const total = segments.reduce((s, x) => s + Math.max(0, x.value), 0);
  if (total === 0) return null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-1.5 w-full overflow-hidden rounded-full">
        {segments.map((s, i) => {
          const w = total === 0 ? 0 : (Math.max(0, s.value) / total) * 100;
          return (
            <div
              key={s.key}
              className={cn(
                TONE_BG[s.tone],
                "h-full transition-[width]",
                i === 0 && "rounded-l-full",
                i === segments.length - 1 && "rounded-r-full",
              )}
              style={{ width: `${w}%` }}
              aria-label={`${s.label}: ${CURRENCY.format(s.value)}`}
            />
          );
        })}
      </div>
      <ul className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5">
        {segments.map((s) => (
          <li key={s.key} className="flex items-baseline gap-2">
            <span
              aria-hidden
              className={cn("size-1.5 shrink-0 translate-y-[-1px] rounded-full", TONE_DOT[s.tone])}
            />
            <span className="text-muted-foreground font-mono text-[10px] tracking-[0.16em]">
              {s.label}
            </span>
            <span className="numeric text-foreground/85 text-[12px] tabular-nums">
              {CURRENCY.format(s.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

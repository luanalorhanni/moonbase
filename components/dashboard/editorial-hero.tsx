import { type ReactNode } from "react";

import { PixelStarSmall } from "@/components/decorative/pixel-icons";
import { cn } from "@/lib/utils";

type Props = {
  /** Small caps caption above the title (e.g. "PORTFOLIO", "INFLOW"). */
  caption: string;
  /** Big italic title — usually the page name (e.g. "investments"). */
  title: string;
  /** Optional secondary italic word displayed in muted color next to the title. */
  accent?: string;
  /** Subtitle line below the title. */
  subtitle?: string;
  /** Optional content rendered on the right side of the hero. */
  right?: ReactNode;
  /** Extra content rendered below the title row (e.g. KPI grid). */
  children?: ReactNode;
  /** Tone preset — drives the corner-glow gradient. */
  tone?: "aqua" | "mauve" | "sand";
};

const TONE_GLOWS: Record<NonNullable<Props["tone"]>, string> = {
  aqua: "radial-gradient(circle at 0% 0%, oklch(0.65 0.10 200 / 0.10), transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.65 0.06 325 / 0.08), transparent 55%)",
  mauve:
    "radial-gradient(circle at 0% 0%, oklch(0.65 0.06 325 / 0.10), transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.65 0.10 200 / 0.08), transparent 55%)",
  sand: "radial-gradient(circle at 0% 0%, oklch(0.78 0.06 70 / 0.10), transparent 55%), radial-gradient(circle at 100% 100%, oklch(0.65 0.10 200 / 0.06), transparent 55%)",
};

/**
 * Editorial hero — large Fraunces italic title with a caps caption,
 * subtle corner glows, and optional right-aligned slot. Drop in as the
 * first child of PageShell on any non-config page so the visual
 * vocabulary stays consistent (matches /habits and /year heroes).
 */
export function EditorialHero({
  caption,
  title,
  accent,
  subtitle,
  right,
  children,
  tone = "aqua",
}: Props) {
  return (
    <section
      className={cn("border-border relative isolate -mx-3 -mt-3 mb-4 overflow-hidden border-b")}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-80"
        style={{ background: TONE_GLOWS[tone] }}
      />
      <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-end md:justify-between md:py-7">
        <div className="flex flex-col gap-1">
          <span className="text-muted-foreground/80 flex items-center gap-2 font-mono text-[10.5px] tracking-[0.32em] uppercase">
            <PixelStarSmall size={5} className="text-primary" />
            {caption}
          </span>
          <h2 className="font-display text-foreground flex flex-wrap items-baseline gap-3 leading-none tracking-[-0.03em]">
            <span className="text-[40px] font-light italic md:text-[56px]">{title}</span>
            {accent && (
              <span className="text-muted-foreground/70 font-display text-[20px] font-light italic md:text-[26px]">
                {accent}
              </span>
            )}
          </h2>
          {subtitle && (
            <span className="text-muted-foreground/80 mt-1 font-mono text-[10.5px] tracking-[0.18em] uppercase">
              {subtitle}
            </span>
          )}
        </div>

        {right}
      </div>

      {children}
    </section>
  );
}

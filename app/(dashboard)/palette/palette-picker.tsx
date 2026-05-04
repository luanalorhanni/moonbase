"use client";

import { Check, Palette as PaletteIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { PageShell } from "@/components/dashboard/page-shell";
import { setPalette } from "@/lib/actions/user-settings";
import type { Palette } from "@/lib/theme/palettes";
import { cn } from "@/lib/utils";

type Props = {
  palettes: Palette[];
  activeId: string;
};

export function PalettePicker({ palettes, activeId }: Props) {
  const router = useRouter();
  const [optimisticId, setOptimisticId] = useState(activeId);
  const [isPending, startTransition] = useTransition();

  function handlePick(id: string) {
    if (id === optimisticId) return;
    const previous = optimisticId;
    setOptimisticId(id);
    startTransition(async () => {
      const result = await setPalette(id);
      if (result.ok) {
        toast.success("palette updated.");
        router.refresh();
      } else {
        setOptimisticId(previous);
        toast.error(result.error);
      }
    });
  }

  return (
    <PageShell title="palette" subtitle="choose how the system dresses each season of the month">
      <div className="mx-auto max-w-4xl px-2 py-4">
        <header className="mb-6 flex items-start gap-3">
          <PaletteIcon
            aria-hidden
            className="text-primary mt-0.5 size-5 shrink-0"
            strokeWidth={1.5}
          />
          <div className="flex flex-col gap-1">
            <p className="text-foreground text-[14px]">
              each palette swaps the primary, accent, and warmth scale — the rest of the system
              (paper, neutrals, semantic signals) stays stable so reading stays calm.
            </p>
            <p className="text-muted-foreground text-[12.5px]">
              the choice applies to both modes (light and dark). switch as many times as you&apos;d like.
            </p>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {palettes.map((p) => (
            <PaletteCard
              key={p.id}
              palette={p}
              active={optimisticId === p.id}
              disabled={isPending}
              onPick={() => handlePick(p.id)}
            />
          ))}
        </div>
      </div>
    </PageShell>
  );
}

function PaletteCard({
  palette,
  active,
  disabled,
  onPick,
}: {
  palette: Palette;
  active: boolean;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "group ring-border-strong relative flex flex-col gap-3 overflow-hidden rounded-xl border p-4 text-left transition-all duration-200",
        "hover:-translate-y-0.5 hover:shadow-md disabled:pointer-events-none disabled:opacity-60",
        active ? "border-primary/60 bg-primary/[0.04]" : "border-border bg-card",
      )}
    >
      {active && (
        <span
          aria-hidden
          className="bg-primary text-primary-foreground absolute top-2 right-2 inline-flex size-5 items-center justify-center rounded-full"
        >
          <Check className="size-3" strokeWidth={2.5} />
        </span>
      )}

      {/* Sample band — a horizontal sandwich of the two main tokens so
          the user reads the personality at a glance without trying. */}
      <div className="border-border-strong relative flex h-16 w-full overflow-hidden rounded-md border">
        <div className="flex-1" style={{ background: palette.tokens.light.primary }} />
        <div className="flex-1" style={{ background: palette.tokens.light.accent }} />
        <div className="flex-1" style={{ background: palette.tokens.dark.primary }} />
        <div className="flex-1" style={{ background: palette.tokens.dark.accent }} />
      </div>

      <div className="flex flex-col gap-0.5">
        <span className="text-foreground text-[14px] font-medium capitalize">{palette.name}</span>
        <span className="text-muted-foreground text-[12.5px]">{palette.description}</span>
      </div>

      <div className="text-muted-foreground/70 mt-1 flex items-center gap-2 font-mono text-[10px] tracking-[0.16em] uppercase">
        <span>light</span>
        <span aria-hidden>·</span>
        <span>dark</span>
      </div>
    </button>
  );
}

import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Dense viewport-fit page shell. Top toolbar (sticky) + main area that fills
 * the rest with internal scroll. Use this on every list/CRUD page so the
 * outermost container doesn't push browser scroll.
 *
 * The body gets the `.enter` class so its first ~6 direct children
 * fade-and-rise in a stagger when the page mounts. Pass `staggered={false}`
 * for pages that manage their own entrance animations (charts, full-bleed
 * heroes) and don't want the staggered child treatment.
 */
export function PageShell({
  title,
  subtitle,
  toolbar,
  children,
  staggered = true,
}: {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  children: ReactNode;
  staggered?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-background/95 supports-backdrop-blur:bg-background/70 flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur sm:gap-4 md:px-7">
        <div className="flex min-w-0 items-baseline gap-2 sm:gap-3">
          <h1 className="text-foreground truncate text-[14px] font-semibold tracking-tight">
            {title}
          </h1>
          {subtitle && (
            <span className="text-muted-foreground truncate text-[12px]">{subtitle}</span>
          )}
        </div>
        {toolbar && (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{toolbar}</div>
        )}
      </div>
      <div
        className={cn(
          "min-h-0 flex-1 overflow-auto px-3 py-3 md:px-4",
          staggered && "enter",
        )}
      >
        {children}
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

/**
 * Drop-in skeleton for dashboard routes. Mirrors the PageShell layout
 * (sticky toolbar + scrollable body) so the navigation feels instant —
 * the user sees the chrome immediately while RSCs stream in.
 */
export function PageSkeleton({
  rows = 6,
  showToolbar = true,
}: {
  rows?: number;
  showToolbar?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-border bg-background/95 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-3 md:px-7">
        <div className="flex items-baseline gap-3">
          <Bar className="h-4 w-24" />
          <Bar className="h-3 w-32 opacity-60" />
        </div>
        {showToolbar && <Bar className="h-7 w-28" />}
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-hidden px-3 py-4 md:px-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Bar
            key={i}
            className="h-12 w-full"
            style={{ animationDelay: `${i * 60}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn("bg-muted/60 animate-pulse rounded-md", className)}
      style={style}
    />
  );
}

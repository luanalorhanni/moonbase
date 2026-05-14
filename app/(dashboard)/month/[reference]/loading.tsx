import { cn } from "@/lib/utils";

export default function MonthLoading() {
  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* top bar */}
      <div className="border-border bg-background/95 flex shrink-0 items-center justify-between gap-4 border-b px-5 py-3">
        <Bar className="h-7 w-24" />
        <div className="flex items-center gap-2">
          <Bar className="h-4 w-20 opacity-50" />
          <Bar className="size-7 rounded-md" />
          <Bar className="h-5 w-40" />
          <Bar className="size-7 rounded-md" />
        </div>
      </div>

      {/* manuscript title */}
      <div className="border-border flex shrink-0 items-center gap-4 border-b px-4 py-4 sm:px-6 sm:py-5">
        <Bar className="size-11 rounded-md" />
        <Bar className="h-9 w-44 sm:h-12 sm:w-56 md:h-14 md:w-72" />
        <Bar className="h-7 w-16 opacity-60 sm:h-9 sm:w-20 md:h-11 md:w-24" />
      </div>

      {/* kpi strip */}
      <div className="border-border grid shrink-0 grid-cols-2 gap-2 border-b p-2.5 md:grid-cols-5 md:gap-2.5 md:px-4 md:py-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="border-primary/[0.08] flex flex-col gap-1.5 rounded-xl border px-3 py-3 lg:px-4 lg:py-3.5"
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <Bar className="h-2.5 w-16" />
            <Bar className="h-5 w-24 lg:h-6" />
          </div>
        ))}
      </div>

      {/* mid grid */}
      <div className="grid min-h-0 shrink-0 grid-cols-1 lg:grid-cols-12">
        <div className="border-border lg:col-span-7 lg:border-r">
          <SectionHeader />
          <div className="flex flex-col gap-5 px-5 py-4">
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <Bar className="h-3.5 w-10" />
                <Bar className="h-4 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Tile key={i} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2.5">
              <div className="flex items-baseline justify-between">
                <Bar className="h-3.5 w-12" />
                <Bar className="h-4 w-20" />
              </div>
              <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Tile key={i} />
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="border-border lg:col-span-5">
          <SectionHeader />
          <div className="flex flex-col gap-2.5 px-4 py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Bar className="size-4 shrink-0 rounded-full" />
                <Bar className="h-3 flex-1" style={{ animationDelay: `${i * 50}ms` }} />
                <Bar className="h-3 w-16 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* total row */}
      <div className="border-border bg-primary/[0.03] flex shrink-0 items-baseline justify-between border-t border-b px-5 py-3">
        <Bar className="h-3 w-24" />
        <Bar className="h-5 w-28" />
      </div>

      {/* detail tabs placeholder */}
      <div className="border-border flex shrink-0 gap-0 border-b px-3 pt-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <Bar key={i} className="mx-1 h-8 w-24 rounded-b-none rounded-t-md" />
        ))}
      </div>
      <div className="min-h-0 flex-1 space-y-2 px-4 py-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <Bar
            key={i}
            className="h-10 w-full"
            style={{ animationDelay: `${i * 45}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

function Bar({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("bg-muted/60 animate-pulse rounded-md", className)} style={style} />;
}

function SectionHeader() {
  return (
    <div className="border-border flex shrink-0 items-baseline justify-between gap-3 border-b px-4 py-3">
      <Bar className="h-3.5 w-20" />
      <Bar className="h-4 w-24" />
    </div>
  );
}

function Tile() {
  return (
    <div className="border-border flex flex-col gap-1 rounded-md border px-3 py-2">
      <Bar className="h-2.5 w-10" />
      <Bar className="h-4 w-16" />
    </div>
  );
}

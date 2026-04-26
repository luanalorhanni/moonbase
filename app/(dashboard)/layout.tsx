import { type ReactNode } from "react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="bg-sidebar/60 border-sidebar-border hidden w-60 flex-col border-r backdrop-blur-xl md:flex">
        <div className="px-6 py-7">
          <div className="flex items-baseline gap-2">
            <PixelMoonCrescent size={12} className="text-primary translate-y-[-1px]" />
            <span className="font-display text-foreground text-[19px] leading-none font-light tracking-tight italic">
              moonbase
            </span>
            <span className="text-muted-foreground/40 ml-auto font-mono text-[9px] tracking-[0.18em]">
              v1
            </span>
          </div>
        </div>
        <SidebarNav />
        <div className="border-sidebar-border mt-auto border-t px-6 py-5">
          <p className="font-display text-muted-foreground/70 text-[12px] leading-relaxed italic">
            a quiet log of
            <br />
            small fortunes.
          </p>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-border bg-background/40 sticky top-0 z-10 border-b backdrop-blur-xl md:hidden">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-2">
              <PixelMoonCrescent size={12} className="text-primary" />
              <span className="text-foreground text-[13px] font-semibold tracking-tight">
                moonbase
              </span>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

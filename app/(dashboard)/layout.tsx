import { type ReactNode } from "react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { ThemeToggle } from "@/components/theme-toggle";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen gap-[15px] overflow-hidden p-[15px]">
      <aside className="bg-sidebar border-sidebar-border hidden w-52 shrink-0 flex-col rounded-lg border md:flex">
        <div className="px-5 py-4">
          <div className="flex items-center gap-2">
            <PixelMoonCrescent size={12} className="text-primary" />
            <span className="text-foreground text-[14px] leading-none font-semibold tracking-tight">
              moonbase
            </span>
            <span className="text-muted-foreground/50 ml-auto font-mono text-[9px] tracking-[0.18em]">
              v1
            </span>
          </div>
        </div>
        <SidebarNav />
        <div className="border-sidebar-border mt-auto flex items-center justify-between border-t px-5 py-3">
          <span className="text-muted-foreground/60 font-mono text-[11px] tracking-[0.14em]">
            personal finance
          </span>
          <ThemeToggle />
        </div>
      </aside>

      <div className="border-border bg-background flex flex-1 flex-col overflow-hidden rounded-lg border">
        <header className="border-border bg-background sticky top-0 z-10 border-b md:hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-3">
            <div className="flex items-center gap-2">
              <PixelMoonCrescent size={12} className="text-primary" />
              <span className="text-foreground text-[14px] font-semibold tracking-tight">
                moonbase
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}

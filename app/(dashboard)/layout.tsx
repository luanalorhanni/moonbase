import { Moon } from "lucide-react";
import { type ReactNode } from "react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full">
      <aside className="bg-sidebar text-sidebar-foreground border-sidebar-border hidden w-60 flex-col border-r md:flex">
        <div className="px-6 py-5">
          <div className="flex items-center gap-2.5">
            <Moon className="text-primary size-[18px]" strokeWidth={1.25} aria-hidden />
            <span className="text-foreground text-sm font-semibold tracking-tight">moonbase</span>
          </div>
        </div>
        <SidebarNav />
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-border bg-background/80 supports-backdrop-blur:bg-background/60 sticky top-0 z-10 border-b backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-2">
              <Moon className="text-primary size-4" strokeWidth={1.25} aria-hidden />
              <span className="text-foreground text-sm font-semibold tracking-tight">moonbase</span>
            </div>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

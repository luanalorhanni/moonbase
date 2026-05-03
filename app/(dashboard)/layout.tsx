import { type ReactNode } from "react";

import { PageTransition } from "@/components/dashboard/page-transition";
import { ResizableSidebar } from "@/components/dashboard/resizable-sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarUser } from "@/components/dashboard/sidebar-user";
import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Defense in depth — middleware already redirects unauthed users,
  // but if the cookie disappears between requests we still bounce out
  // cleanly here instead of rendering an empty shell.
  const user = await requireUser();
  return (
    <div className="flex h-screen gap-[15px] overflow-hidden p-[15px]">
      <ResizableSidebar>
        <div className="shrink-0 px-5 py-4">
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
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav />
        </div>
        <div className="border-sidebar-border flex shrink-0 items-center gap-2 border-t px-5 py-3">
          <SidebarUser email={user.email} name={user.name} avatarUrl={user.avatarUrl} />
          <ThemeToggle />
        </div>
      </ResizableSidebar>

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
        <main className="flex-1 overflow-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

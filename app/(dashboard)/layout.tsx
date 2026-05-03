import { type ReactNode } from "react";

import { MobileNav } from "@/components/dashboard/mobile-nav";
import { PageTransition } from "@/components/dashboard/page-transition";
import { ResizableSidebar } from "@/components/dashboard/resizable-sidebar";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarUser } from "@/components/dashboard/sidebar-user";
import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser, type CurrentUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Defense in depth — middleware already redirects unauthed users,
  // but if the cookie disappears between requests we still bounce out
  // cleanly here instead of rendering an empty shell.
  const user = await requireUser();
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden md:h-screen md:flex-row md:gap-[15px] md:p-[15px]">
      {/* Desktop sidebar — only mounts at md+; hidden on mobile in
          favor of the slide-in drawer below. */}
      <ResizableSidebar>
        <SidebarChrome user={user} />
      </ResizableSidebar>

      {/* Main pane. On mobile this fills the viewport edge-to-edge so
          the unsupported sidebar doesn't waste space. */}
      <div className="border-border bg-background flex min-h-0 flex-1 flex-col overflow-hidden md:rounded-lg md:border">
        <header className="border-border bg-background/95 supports-backdrop-blur:bg-background/70 safe-top sticky top-0 z-10 border-b backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-2.5">
            <MobileNav>
              <SidebarChrome user={user} />
            </MobileNav>
            <div className="flex items-center gap-2">
              <PixelMoonCrescent size={12} className="text-primary" />
              <span className="text-foreground text-[14px] font-semibold tracking-tight">
                moonbase
              </span>
            </div>
            <ThemeToggle />
          </div>
        </header>
        <main className="min-h-0 flex-1 overflow-auto">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

/**
 * The shared inner content of both the desktop sidebar and the mobile
 * drawer — brand mark on top, nav in the middle, user chip on the
 * bottom. Lives in the layout file because the two surfaces want
 * exactly the same bits in the same order.
 */
function SidebarChrome({ user }: { user: CurrentUser }) {
  return (
    <>
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
    </>
  );
}

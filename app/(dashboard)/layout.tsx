import { type ReactNode } from "react";

import { MobileNav } from "@/components/dashboard/mobile-nav";
import { PageTransition } from "@/components/dashboard/page-transition";
import { ResizableSidebar } from "@/components/dashboard/resizable-sidebar";
import { SidebarBrand } from "@/components/dashboard/sidebar-brand";
import { SidebarFooter } from "@/components/dashboard/sidebar-footer";
import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { SidebarUser } from "@/components/dashboard/sidebar-user";
import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { requireUser, type CurrentUser } from "@/lib/auth/session";
import { getUserSettings } from "@/lib/queries/user-settings";
import { findPalette, paletteCss } from "@/lib/theme/palettes";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  // Defense in depth — middleware already redirects unauthed users,
  // but if the cookie disappears between requests we still bounce out
  // cleanly here instead of rendering an empty shell.
  const [user, settings] = await Promise.all([requireUser(), getUserSettings()]);
  const palette = findPalette(settings?.palette);
  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden md:h-screen md:flex-row md:gap-[15px] md:p-[15px]">
      {/* User-selected palette — overrides the defaults from globals.css.
          A render-time <style> block keeps this data-driven without
          shipping the full preset table to the client. */}
      <style dangerouslySetInnerHTML={{ __html: paletteCss(palette) }} />

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
 * Shared inner content of both the desktop sidebar and the mobile
 * drawer — brand mark on top, nav in the middle, user chip on the
 * bottom. SidebarBrand and SidebarFooter are collapse-aware on
 * desktop (via SidebarCollapseProvider in ResizableSidebar) and fall
 * back to the expanded layout on mobile, where there's no provider.
 */
function SidebarChrome({ user }: { user: CurrentUser }) {
  return (
    <>
      <SidebarBrand themeToggle={<ThemeToggle />} />
      <div className="min-h-0 flex-1 overflow-y-auto">
        <SidebarNav />
      </div>
      <SidebarFooter
        user={
          <SidebarUser email={user.email} name={user.name} avatarUrl={user.avatarUrl} />
        }
      />
    </>
  );
}

import { Moon } from "lucide-react";
import { type ReactNode } from "react";

import { SidebarNav } from "@/components/dashboard/sidebar-nav";
import { Button } from "@/components/ui/button";
import { signOut } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";

/**
 * Authenticated layout: sidebar on desktop (≥ md) with brand mark, primary
 * navigation and the signed-in user's email plus Sair. On mobile the sidebar
 * collapses entirely; a thin top bar replaces it. A mobile-friendly drawer
 * is left for a future PR — the navigation is shallow enough now that it
 * isn't blocking anything.
 *
 * requireUser() runs again here as defence in depth alongside the proxy.
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

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
        <div className="border-sidebar-border mt-auto border-t px-4 py-4">
          <div className="flex flex-col gap-1">
            <span className="text-muted-foreground/70 truncate px-2 font-mono text-[10px] leading-relaxed">
              {user.email}
            </span>
            <form action={signOut}>
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground w-full justify-start text-sm font-normal"
              >
                Sair
              </Button>
            </form>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="border-border bg-background/80 supports-backdrop-blur:bg-background/60 sticky top-0 z-10 border-b backdrop-blur md:hidden">
          <div className="flex items-center justify-between gap-4 px-6 py-3">
            <div className="flex items-center gap-2">
              <Moon className="text-primary size-4" strokeWidth={1.25} aria-hidden />
              <span className="text-foreground text-sm font-semibold tracking-tight">moonbase</span>
            </div>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </header>
        <main className="flex flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}

import { Moon } from "lucide-react";
import { type ReactNode } from "react";

import { signOut } from "@/lib/actions/auth";
import { requireUser } from "@/lib/auth/session";
import { Button } from "@/components/ui/button";

/**
 * Layout for every authenticated route. Calls requireUser() — defence in
 * depth alongside the root middleware — so that any future direct navigation
 * to a dashboard page also gets gated. The simple top bar is intentional;
 * primary navigation lands later (phase 5+).
 */
export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const user = await requireUser();

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-border bg-background/80 supports-backdrop-blur:bg-background/60 sticky top-0 z-10 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2">
            <Moon className="text-muted-foreground size-5" strokeWidth={1.25} aria-hidden />
            <span className="font-semibold tracking-tight">moonbase</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-muted-foreground hidden text-xs sm:inline">{user.email}</span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Sair
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}

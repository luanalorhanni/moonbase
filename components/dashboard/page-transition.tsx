"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Animates the dashboard's main pane on every route change. The
 * pathname-keyed wrapper is unmounted + remounted on navigation,
 * which re-fires the CSS `page-enter` animation defined in
 * globals.css. Cheap, reduced-motion-safe, and works for both client
 * and server components inside it.
 */
export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-transition flex h-full min-h-0 flex-col">
      {children}
    </div>
  );
}

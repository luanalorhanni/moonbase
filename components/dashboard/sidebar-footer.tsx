"use client";

import { type ReactNode } from "react";

import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Bottom of the sidebar — just the user chip. Theme toggle and the
 * collapse toggle live up in SidebarBrand now, which keeps the
 * footer airy and avoids stacking three icons on top of each other
 * in icon-only mode.
 */
export function SidebarFooter({ user }: { user: ReactNode }) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div
      className={cn(
        "border-sidebar-border flex shrink-0 items-center border-t",
        "transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        collapsed ? "justify-center px-2 py-3" : "px-5 py-3",
      )}
    >
      {user}
    </div>
  );
}

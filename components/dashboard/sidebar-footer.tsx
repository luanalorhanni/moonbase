"use client";

import { type ReactNode } from "react";

import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Bottom of the sidebar — holds the user chip and the theme toggle.
 * Switches between a horizontal row (expanded) and a vertical stack
 * (collapsed) so each control still has room without crowding the
 * narrow icon column.
 */
export function SidebarFooter({
  user,
  themeToggle,
}: {
  user: ReactNode;
  themeToggle: ReactNode;
}) {
  const { collapsed } = useSidebarCollapse();
  return (
    <div
      className={cn(
        "border-sidebar-border shrink-0 border-t",
        collapsed ? "flex flex-col items-center gap-3 px-2 py-3" : "flex items-center gap-2 px-5 py-3",
      )}
    >
      {user}
      {themeToggle}
    </div>
  );
}

"use client";

import { type ReactNode } from "react";

import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Bottom of the sidebar — holds the user chip and the theme toggle.
 * Always laid out as a column so the flex direction never flips when
 * the sidebar collapses (a flex-direction change can't transition;
 * keeping a single direction is what makes the toggle feel continuous).
 *
 * The padding shrinks when collapsed so the icons align with the rest
 * of the icon column.
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
        "border-sidebar-border flex shrink-0 flex-col items-stretch gap-3 border-t",
        "transition-[padding] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        collapsed ? "items-center px-2 py-3" : "px-5 py-3",
      )}
    >
      {user}
      <div className={cn("flex", collapsed ? "justify-center" : "justify-end")}>
        {themeToggle}
      </div>
    </div>
  );
}

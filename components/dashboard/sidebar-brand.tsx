"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { type ReactNode } from "react";

import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Top of the sidebar — moon mark + brand text + chrome controls
 * (theme toggle and collapse toggle). When collapsed, the brand text
 * folds away and the controls stack below the moon mark in a single
 * narrow column. The theme toggle is hosted up here (rather than in
 * the footer next to the user chip) so the footer can breathe.
 */
export function SidebarBrand({ themeToggle }: { themeToggle: ReactNode }) {
  const { collapsed, toggle } = useSidebarCollapse();
  return (
    <div
      className={cn(
        "shrink-0 transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        collapsed ? "px-2 py-3" : "px-5 py-4",
      )}
    >
      <div
        className={cn(
          "flex transition-[gap] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          collapsed ? "flex-col items-center gap-2" : "items-center gap-2",
        )}
      >
        <PixelMoonCrescent size={12} className="text-primary shrink-0" />
        {!collapsed && (
          <span className="text-foreground min-w-0 truncate text-[14px] leading-none font-semibold tracking-tight">
            moonbase
          </span>
        )}
        <div
          className={cn(
            "flex items-center gap-1",
            collapsed ? "flex-col" : "ml-auto",
          )}
        >
          {themeToggle}
          <button
            type="button"
            onClick={toggle}
            aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
            title={collapsed ? "expand sidebar" : "collapse sidebar"}
            className="text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors"
          >
            {collapsed ? (
              <PanelLeftOpen aria-hidden className="size-3.5" strokeWidth={1.6} />
            ) : (
              <PanelLeftClose aria-hidden className="size-3.5" strokeWidth={1.6} />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

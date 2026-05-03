"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

/**
 * Top of the sidebar — moon mark + brand text + the toggle that
 * switches between the icon-only collapsed mode and the full width
 * expanded mode. When collapsed, the brand text and "v1" badge fold
 * away; only the mark and toggle stay visible.
 */
export function SidebarBrand() {
  const { collapsed, toggle } = useSidebarCollapse();
  return (
    <div
      className={cn(
        "shrink-0 transition-[padding] duration-200",
        collapsed ? "px-2 py-3" : "px-5 py-4",
      )}
    >
      <div
        className={cn(
          "flex items-center gap-2",
          collapsed && "flex-col gap-2",
        )}
      >
        <span
          className={cn(
            "flex items-center gap-2",
            collapsed && "justify-center",
          )}
        >
          <PixelMoonCrescent size={12} className="text-primary" />
          {!collapsed && (
            <span className="text-foreground text-[14px] leading-none font-semibold tracking-tight">
              moonbase
            </span>
          )}
        </span>
        {!collapsed && (
          <span className="text-muted-foreground/50 ml-auto font-mono text-[9px] tracking-[0.18em]">
            v1
          </span>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
          title={collapsed ? "expand sidebar" : "collapse sidebar"}
          className={cn(
            "text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
            collapsed && "ml-0",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen aria-hidden className="size-3.5" strokeWidth={1.6} />
          ) : (
            <PanelLeftClose aria-hidden className="size-3.5" strokeWidth={1.6} />
          )}
        </button>
      </div>
    </div>
  );
}

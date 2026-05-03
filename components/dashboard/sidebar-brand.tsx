"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { PixelMoonCrescent } from "@/components/decorative/pixel-icons";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

const TRANSITION =
  "transition-[max-width,opacity,padding,gap] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]";

/**
 * Top of the sidebar — moon mark + brand text + the toggle that
 * switches between icon-only and full-width modes. Renders the same
 * structure in both modes; the brand text and version badge fade
 * out via opacity + max-width transitions so the icons stay anchored
 * while the chrome animates.
 */
export function SidebarBrand() {
  const { collapsed, toggle } = useSidebarCollapse();
  return (
    <div
      className={cn(
        "shrink-0 transition-[padding] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        collapsed ? "px-2 py-3" : "px-5 py-4",
      )}
    >
      <div className={cn("flex items-center gap-2", TRANSITION)}>
        <PixelMoonCrescent size={12} className="text-primary shrink-0" />
        <span
          className={cn(
            "text-foreground overflow-hidden text-[14px] leading-none font-semibold tracking-tight whitespace-nowrap",
            TRANSITION,
            collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
          )}
        >
          moonbase
        </span>
        <span
          className={cn(
            "text-muted-foreground/50 ml-auto overflow-hidden font-mono text-[9px] tracking-[0.18em] whitespace-nowrap",
            TRANSITION,
            collapsed ? "ml-0 max-w-0 opacity-0" : "max-w-[40px] opacity-100",
          )}
        >
          v1
        </span>
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "expand sidebar" : "collapse sidebar"}
          title={collapsed ? "expand sidebar" : "collapse sidebar"}
          className={cn(
            "text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-6 shrink-0 items-center justify-center rounded-md transition-colors",
            collapsed && "ml-auto",
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

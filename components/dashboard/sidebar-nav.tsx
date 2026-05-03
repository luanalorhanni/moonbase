"use client";

import {
  Archive,
  ArrowDownToLine,
  Banknote,
  Calendar,
  CalendarDays,
  CalendarRange,
  ChevronDown,
  CircleCheckBig,
  CreditCard,
  HandCoins,
  LayoutDashboard,
  type LucideIcon,
  PiggyBank,
  ReceiptText,
  Repeat,
  Settings2,
  Sparkles,
  Sprout,
  Tag,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { PixelStarSmall } from "@/components/decorative/pixel-icons";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };
const HOME_ITEM: NavItem = { href: "/", label: "home", icon: Sparkles };

type NavGroup = {
  /** Stable id used for persisting open/closed state. */
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
};

const GROUPS: NavGroup[] = [
  {
    id: "routines",
    label: "routines",
    icon: Sprout,
    items: [
      { href: "/habits", label: "habits", icon: CircleCheckBig },
      { href: "/calendar", label: "calendar", icon: Calendar },
    ],
  },
  {
    id: "finance-control",
    label: "finance control",
    icon: LayoutDashboard,
    items: [
      { href: "/month", label: "month", icon: CalendarRange },
      { href: "/year", label: "year", icon: CalendarDays },
      { href: "/investments", label: "investments", icon: PiggyBank },
      { href: "/receivables", label: "receivables", icon: HandCoins },
    ],
  },
  {
    id: "finance-register",
    label: "finance register",
    icon: Wallet,
    items: [
      { href: "/expenses/cash", label: "cash expenses", icon: Banknote },
      { href: "/expenses/credit", label: "credit expenses", icon: ReceiptText },
      { href: "/expenses/fixed", label: "fixed expenses", icon: Repeat },
      { href: "/incomes", label: "incomes", icon: ArrowDownToLine },
    ],
  },
  {
    id: "config",
    label: "config",
    icon: Settings2,
    items: [
      { href: "/cards", label: "cards", icon: CreditCard },
      { href: "/categories", label: "categories", icon: Tag },
      { href: "/snapshots", label: "snapshots", icon: Archive },
    ],
  },
];

const STORAGE_KEY = "moonbase-sidebar-groups";

const TRANSITION = "transition-[max-width,opacity,padding,margin,height] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]";

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupHasActive(pathname: string, group: NavGroup): boolean {
  return group.items.some((i) => isItemActive(pathname, i.href));
}

export function SidebarNav() {
  const pathname = usePathname();
  const { collapsed } = useSidebarCollapse();

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) initial[g.id] = true;
    return initial;
  });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, boolean>;
        setOpenGroups((prev) => ({ ...prev, ...parsed }));
      }
    } catch {
      // ignore
    }
  }, []);

  function toggleGroup(id: string) {
    setOpenGroups((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  const homeActive = isItemActive(pathname, HOME_ITEM.href);

  return (
    <nav
      aria-label="primary"
      data-collapsed={collapsed}
      className={cn(
        "flex flex-col gap-1 py-3",
        collapsed ? "items-center px-2" : "px-3",
      )}
    >
      <NavLink
        href={HOME_ITEM.href}
        icon={HOME_ITEM.icon}
        label={HOME_ITEM.label}
        isActive={homeActive}
        collapsed={collapsed}
      />

      <div
        aria-hidden
        className={cn(
          "border-sidebar-border/60 mt-1 border-t pt-1",
          TRANSITION,
          collapsed ? "w-8 self-center" : "w-full self-stretch",
        )}
      />

      {GROUPS.map((group, idx) => {
        const hasActive = groupHasActive(pathname, group);
        const isOpen = openGroups[group.id] ?? true;
        // Items always render — we let the height/opacity transition
        // hide them when the group is collapsed, instead of unmounting.
        // Sidebar collapsed forces all groups open; the group header
        // itself is then hidden but icons stay in place.
        const showItems = collapsed || isOpen || hasActive;
        const GroupIcon = group.icon;

        return (
          <div
            key={group.id}
            className={cn(
              "flex flex-col",
              idx > 0 && "border-sidebar-border/60 mt-1 border-t pt-1",
            )}
          >
            {/* Group header — collapses to zero height when sidebar is
                in icon mode, so the icons below tighten up nicely. */}
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={showItems}
              tabIndex={collapsed ? -1 : 0}
              aria-hidden={collapsed}
              className={cn(
                "group/header text-muted-foreground hover:text-foreground flex items-center overflow-hidden rounded-lg text-left",
                TRANSITION,
                hasActive && "text-foreground",
                collapsed
                  ? "pointer-events-none max-h-0 gap-0 px-0 py-0 opacity-0"
                  : "max-h-8 gap-2.5 px-3 py-1.5 opacity-100",
              )}
            >
              <GroupIcon
                aria-hidden
                strokeWidth={1.6}
                className={cn(
                  "size-[14px] shrink-0 transition-colors",
                  hasActive ? "text-primary" : "opacity-60 group-hover/header:opacity-100",
                )}
              />
              <span className="flex-1 font-mono text-[10.5px] tracking-[0.18em] uppercase">
                {group.label}
              </span>
              <ChevronDown
                aria-hidden
                strokeWidth={1.8}
                className={cn(
                  "size-3 shrink-0 transition-transform duration-200",
                  showItems ? "rotate-0" : "-rotate-90",
                )}
              />
            </button>

            {showItems && (
              <div className="mt-0.5 flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavLink
                    key={item.href}
                    href={item.href}
                    icon={item.icon}
                    label={item.label}
                    isActive={isItemActive(pathname, item.href)}
                    collapsed={collapsed}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

/**
 * Individual nav link — one structure that handles both modes via
 * CSS. When collapsed we shrink the label to zero width (with
 * opacity 0) and zero out the gap so icons centre naturally inside
 * the 64px column.
 */
function NavLink({
  href,
  icon: ItemIcon,
  label,
  isActive,
  collapsed,
}: {
  href: string;
  icon: LucideIcon;
  label: string;
  isActive: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      title={collapsed ? label : undefined}
      className={cn(
        "group relative flex items-center overflow-hidden rounded-xl text-[14px] transition-[background-color,color,padding,gap] duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        isActive
          ? "bg-sidebar-accent text-foreground"
          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        collapsed
          ? "size-10 shrink-0 justify-center gap-0 px-0 py-0"
          : "gap-3 px-3 py-2",
      )}
    >
      <span
        aria-hidden
        className={cn(
          "absolute inset-0 -z-0 opacity-0 transition-opacity duration-300",
          collapsed
            ? "bg-[radial-gradient(circle_at_50%_50%,oklch(0.65_0.10_200/0.22),transparent_70%)]"
            : "bg-[radial-gradient(circle_at_0%_50%,oklch(0.65_0.10_200/0.20),transparent_60%)]",
          "group-hover:opacity-100",
          isActive && "opacity-60",
        )}
      />
      <span
        aria-hidden
        className={cn(
          "absolute top-1/2 left-0 -translate-y-1/2 transition-opacity duration-200",
          isActive && !collapsed ? "opacity-100" : "opacity-0",
        )}
      >
        <PixelStarSmall size={6} className="text-primary" />
      </span>
      <ItemIcon
        className={cn(
          "relative size-[15px] shrink-0 transition-colors",
          isActive ? "text-primary" : "opacity-60 group-hover:opacity-100",
        )}
        strokeWidth={1.6}
        aria-hidden
      />
      <span
        className={cn(
          "relative whitespace-nowrap transition-[max-width,opacity] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          collapsed ? "max-w-0 opacity-0" : "max-w-[160px] opacity-100",
        )}
      >
        {label}
      </span>
    </Link>
  );
}

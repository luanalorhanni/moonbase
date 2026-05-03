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

  // Initialise from saved state once. Groups containing the active route
  // are forced open on every render below regardless of saved state.
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const g of GROUPS) initial[g.id] = true; // default open until hydrated
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

  // Icon-only mode: flatten the groups into a single column of icons
  // with native tooltips. No group headers — those need text to be
  // useful and would just be empty rows here.
  if (collapsed) {
    const flat = [HOME_ITEM, ...GROUPS.flatMap((g) => g.items)];
    return (
      <nav aria-label="primary" className="flex flex-col items-center gap-1 px-2 py-3">
        {flat.map((item) => {
          const isActive = isItemActive(pathname, item.href);
          const ItemIcon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              title={item.label}
              className={cn(
                "group relative flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-xl transition-all duration-200",
                isActive
                  ? "bg-sidebar-accent text-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "absolute inset-0 -z-0 opacity-0 transition-opacity duration-300",
                  "bg-[radial-gradient(circle_at_50%_50%,oklch(0.65_0.10_200/0.22),transparent_70%)]",
                  "group-hover:opacity-100",
                  isActive && "opacity-60",
                )}
              />
              <ItemIcon
                aria-hidden
                strokeWidth={1.6}
                className={cn(
                  "relative size-[16px] transition-colors",
                  isActive ? "text-primary" : "opacity-70 group-hover:opacity-100",
                )}
              />
            </Link>
          );
        })}
      </nav>
    );
  }

  return (
    <nav aria-label="primary" className="flex flex-col gap-1 px-3 py-3">
      {/* Top-level home — sits above the groups, no drawer chrome. */}
      <Link
        href={HOME_ITEM.href}
        aria-current={homeActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-[14px] transition-all duration-200",
          homeActive
            ? "bg-sidebar-accent text-foreground"
            : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "absolute inset-0 -z-0 opacity-0 transition-opacity duration-300",
            "bg-[radial-gradient(circle_at_0%_50%,oklch(0.65_0.10_200/0.20),transparent_60%)]",
            "group-hover:opacity-100",
            homeActive && "opacity-60",
          )}
        />
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 left-0 -translate-y-1/2 transition-opacity duration-200",
            homeActive ? "opacity-100" : "opacity-0",
          )}
        >
          <PixelStarSmall size={6} className="text-primary" />
        </span>
        <HOME_ITEM.icon
          className={cn(
            "relative size-[15px] shrink-0 transition-colors",
            homeActive ? "text-primary" : "opacity-60 group-hover:opacity-100",
          )}
          strokeWidth={1.6}
          aria-hidden
        />
        <span className="relative">{HOME_ITEM.label}</span>
      </Link>

      <div className="border-sidebar-border/60 mt-1 border-t pt-1" />

      {GROUPS.map((group, idx) => {
        const hasActive = groupHasActive(pathname, group);
        // Force open if the active route belongs here, even when the user
        // collapsed it earlier — they need to see where they are.
        const isOpen = openGroups[group.id] ?? true;
        const showItems = isOpen || hasActive;
        const GroupIcon = group.icon;

        return (
          <div
            key={group.id}
            className={cn(
              "flex flex-col",
              idx > 0 && "border-sidebar-border/60 mt-1 border-t pt-1",
            )}
          >
            <button
              type="button"
              onClick={() => toggleGroup(group.id)}
              aria-expanded={showItems}
              className={cn(
                "group/header text-muted-foreground hover:text-foreground flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-left transition-colors",
                hasActive && "text-foreground",
              )}
            >
              <GroupIcon
                aria-hidden
                strokeWidth={1.6}
                className={cn(
                  "size-[14px] shrink-0 transition-colors",
                  hasActive
                    ? "text-primary"
                    : "opacity-60 group-hover/header:opacity-100",
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
                {group.items.map((item) => {
                  const isActive = isItemActive(pathname, item.href);
                  const ItemIcon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={isActive ? "page" : undefined}
                      className={cn(
                        "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-[14px] transition-all duration-200",
                        isActive
                          ? "bg-sidebar-accent text-foreground"
                          : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
                      )}
                    >
                      <span
                        aria-hidden
                        className={cn(
                          "absolute inset-0 -z-0 opacity-0 transition-opacity duration-300",
                          "bg-[radial-gradient(circle_at_0%_50%,oklch(0.65_0.10_200/0.20),transparent_60%)]",
                          "group-hover:opacity-100",
                          isActive && "opacity-60",
                        )}
                      />
                      <span
                        aria-hidden
                        className={cn(
                          "absolute top-1/2 left-0 -translate-y-1/2 transition-opacity duration-200",
                          isActive ? "opacity-100" : "opacity-0",
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
                      <span className="relative">{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );
}

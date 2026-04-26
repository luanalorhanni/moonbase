"use client";

import {
  Archive,
  ArrowDownToLine,
  Banknote,
  CreditCard,
  HandCoins,
  Home,
  PiggyBank,
  ReceiptText,
  Repeat,
  Tag,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { PixelStarSmall } from "@/components/decorative/pixel-icons";
import { cn } from "@/lib/utils";

type NavItem = { href: string; label: string; icon: LucideIcon };

const items: NavItem[] = [
  { href: "/", label: "home", icon: Home },
  { href: "/cards", label: "cards", icon: CreditCard },
  { href: "/categories", label: "categories", icon: Tag },
  { href: "/expenses/cash", label: "cash expenses", icon: Banknote },
  { href: "/expenses/credit", label: "credit expenses", icon: ReceiptText },
  { href: "/expenses/fixed", label: "fixed expenses", icon: Repeat },
  { href: "/incomes", label: "incomes", icon: ArrowDownToLine },
  { href: "/receivables", label: "receivables", icon: HandCoins },
  { href: "/investments", label: "investments", icon: PiggyBank },
  { href: "/snapshots", label: "snapshots", icon: Archive },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="primary" className="flex flex-col gap-0.5 px-3 py-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 overflow-hidden rounded-xl px-3 py-2 text-[13px] transition-all duration-200",
              isActive
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/50 hover:text-foreground",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-0 -z-0 opacity-0 transition-opacity duration-300",
                "bg-[radial-gradient(circle_at_0%_50%,oklch(0.82_0.13_78/0.18),transparent_60%)]",
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

            <item.icon
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
    </nav>
  );
}

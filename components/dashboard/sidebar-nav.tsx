"use client";

import { ArrowDownToLine, Banknote, CreditCard, Home, Tag, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/cards", label: "Cartões", icon: CreditCard },
  { href: "/categories", label: "Categorias", icon: Tag },
  { href: "/expenses/cash", label: "Despesas à vista", icon: Banknote },
  { href: "/incomes", label: "Receitas", icon: ArrowDownToLine },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Navegação principal" className="flex flex-col gap-0.5 px-3 py-3">
      {items.map((item) => {
        const isActive =
          pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-150",
              isActive
                ? "bg-primary/[0.07] text-foreground font-medium"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground",
            )}
          >
            {isActive && (
              <span
                className="bg-primary absolute inset-y-1.5 left-0 w-[2.5px] rounded-full"
                aria-hidden
              />
            )}
            <item.icon
              className={cn("size-4 shrink-0", isActive ? "text-primary" : "opacity-50")}
              strokeWidth={1.5}
              aria-hidden
            />
            <span>{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

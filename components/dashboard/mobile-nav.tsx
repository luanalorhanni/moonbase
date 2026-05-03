"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Slide-in nav drawer for screens below `md`. On desktop the
 * permanent sidebar covers the same job, so the trigger button stays
 * `md:hidden` and the drawer never mounts there.
 *
 * The drawer auto-closes whenever the route changes — tapping a nav
 * link should feel like clicking it on desktop, not "navigated and
 * the drawer is still in your face".
 */
export function MobileNav({
  trigger,
  children,
}: {
  trigger?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Close on route change.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={
          trigger ? (
            <span>{trigger}</span>
          ) : (
            <button
              type="button"
              aria-label="open navigation"
              className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-9 items-center justify-center rounded-md border transition-colors md:hidden"
            >
              <Menu aria-hidden className="size-4" strokeWidth={1.6} />
            </button>
          )
        }
      />
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop
          className={cn(
            "fixed inset-0 z-[60] bg-black/30 backdrop-blur-sm",
            "data-open:animate-in data-open:fade-in-0",
            "data-closed:animate-out data-closed:fade-out-0",
            "duration-200 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          )}
        />
        <DialogPrimitive.Popup
          className={cn(
            "bg-sidebar text-sidebar-foreground border-sidebar-border fixed inset-y-0 left-0 z-[70] flex w-[80%] max-w-[280px] flex-col border-r shadow-2xl outline-none",
            "data-open:animate-in data-open:slide-in-from-left",
            "data-closed:animate-out data-closed:slide-out-to-left",
            "data-open:duration-[280ms] data-closed:duration-[200ms] ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          )}
        >
          <DialogPrimitive.Close
            className="text-muted-foreground hover:text-foreground absolute top-3 right-3 inline-flex size-7 items-center justify-center rounded-md transition-colors"
            aria-label="close navigation"
          >
            <X aria-hidden className="size-4" strokeWidth={1.6} />
          </DialogPrimitive.Close>
          {children}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

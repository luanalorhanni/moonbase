"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

const MIN_WIDTH = 180;
const MAX_WIDTH = 380;
const DEFAULT_WIDTH = 208; // matches Tailwind's w-52
const STORAGE_KEY = "moonbase-sidebar-width";

/**
 * Wraps the dashboard sidebar so the user can drag its right edge to
 * resize. Width is persisted to localStorage. Only renders the resize
 * handle on md+ screens — on mobile the layout already collapses the
 * sidebar entirely, so resizing isn't relevant.
 */
export function ResizableSidebar({ children }: { children: ReactNode }) {
  const [width, setWidth] = useState<number>(DEFAULT_WIDTH);
  const [isDragging, setIsDragging] = useState(false);
  // Track raw pointer state in a ref so the listeners always read the
  // latest values without re-attaching on every render.
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // Restore persisted width once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const n = Number(raw);
        if (Number.isFinite(n)) setWidth(clamp(n));
      }
    } catch {
      // ignore — storage may be blocked
    }
  }, []);

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (!dragRef.current) return;
    const delta = e.clientX - dragRef.current.startX;
    setWidth(clamp(dragRef.current.startWidth + delta));
  }, []);

  const onMouseUp = useCallback(() => {
    dragRef.current = null;
    setIsDragging(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("mouseup", onMouseUp);
    try {
      // Persist the latest width once dragging finishes.
      localStorage.setItem(STORAGE_KEY, String(Math.round(width)));
    } catch {
      // ignore
    }
  }, [onMouseMove, width]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      dragRef.current = { startX: e.clientX, startWidth: width };
      setIsDragging(true);
      // Lock the cursor and disable text selection while dragging so the
      // experience stays smooth across the whole viewport.
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [width, onMouseMove, onMouseUp],
  );

  // Cleanup if the component unmounts mid-drag.
  useEffect(() => {
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [onMouseMove, onMouseUp]);

  // Keyboard handler on the handle: arrow keys nudge by 8px, shift +
  // arrow nudges by 32px. Useful for accessibility + precise sizing.
  function onKeyDown(e: React.KeyboardEvent) {
    const step = e.shiftKey ? 32 : 8;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setWidth((w) => {
        const next = clamp(w - step);
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setWidth((w) => {
        const next = clamp(w + step);
        try {
          localStorage.setItem(STORAGE_KEY, String(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    } else if (e.key === "Home") {
      e.preventDefault();
      setWidth(DEFAULT_WIDTH);
      try {
        localStorage.setItem(STORAGE_KEY, String(DEFAULT_WIDTH));
      } catch {
        /* ignore */
      }
    }
  }

  return (
    <aside
      style={{ width }}
      className="bg-sidebar border-sidebar-border relative hidden shrink-0 flex-col overflow-hidden rounded-lg border md:flex"
    >
      {children}

      {/* Drag handle — sits on the right edge of the sidebar, only
          shows its tinted line on hover/drag so it stays subtle. */}
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label="resize sidebar"
        aria-valuemin={MIN_WIDTH}
        aria-valuemax={MAX_WIDTH}
        aria-valuenow={Math.round(width)}
        tabIndex={0}
        onMouseDown={onMouseDown}
        onKeyDown={onKeyDown}
        className={cn(
          "group absolute top-0 right-0 z-20 flex h-full w-2 translate-x-1/2 cursor-col-resize touch-none select-none focus-visible:outline-none",
        )}
      >
        <span
          aria-hidden
          className={cn(
            "bg-primary/0 group-hover:bg-primary/40 group-focus-visible:bg-primary/60 mx-auto h-full w-[2px] rounded-full transition-colors",
            isDragging && "bg-primary/60",
          )}
        />
      </div>
    </aside>
  );
}

function clamp(n: number): number {
  return Math.min(Math.max(n, MIN_WIDTH), MAX_WIDTH);
}

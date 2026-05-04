"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Tracks whether the desktop sidebar is in icon-only "collapsed" mode.
 * State is persisted to localStorage so a refresh preserves the user's
 * preference. Mobile uses the slide-in drawer separately and does not
 * read this flag.
 */
type Ctx = {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
};

const SidebarCollapseContext = createContext<Ctx | null>(null);

const STORAGE_KEY = "moonbase-sidebar-collapsed";

export function SidebarCollapseProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      // ignore — storage may be blocked
    }
  }, []);

  function setAndPersist(v: boolean) {
    setCollapsed(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      // ignore
    }
  }

  return (
    <SidebarCollapseContext.Provider
      value={{
        collapsed,
        setCollapsed: setAndPersist,
        toggle: () => setAndPersist(!collapsed),
      }}
    >
      {children}
    </SidebarCollapseContext.Provider>
  );
}

export function useSidebarCollapse(): Ctx {
  const ctx = useContext(SidebarCollapseContext);
  // Tolerate missing provider (e.g. on the mobile drawer which intentionally
  // doesn't wrap children) — fall back to "always expanded".
  return (
    ctx ?? {
      collapsed: false,
      toggle: () => {},
      setCollapsed: () => {},
    }
  );
}

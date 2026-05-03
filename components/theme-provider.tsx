"use client";

import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";

/**
 * Minimal light/dark theme provider — no inline script.
 *
 * We deliberately avoid `next-themes` here because its provider injects a
 * `<script>` tag inside the React tree, which Next 16 flags as a console
 * error ("scripts inside React components are never executed when rendering
 * on the client").
 *
 * The cost of dropping the inline script is a brief flash for users whose
 * saved preference differs from the default. Since the default is `light`
 * and most desktops are also light, the flash is rarely visible. The init
 * script in `app/layout.tsx` (loaded via `next/script` with
 * `strategy="beforeInteractive"`) closes the gap when needed.
 */

type Theme = "light" | "dark";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (next: Theme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = "moonbase-theme";

function applyClass(theme: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light");

  // Apply the saved preference synchronously after hydration, before paint —
  // useLayoutEffect minimises (but doesn't fully eliminate) the flash that
  // dark-mode users would see on first load.
  useLayoutEffect(() => {
    const stored = (() => {
      try {
        return localStorage.getItem(STORAGE_KEY);
      } catch {
        return null;
      }
    })();
    const initial: Theme = stored === "dark" ? "dark" : "light";
    setThemeState(initial);
    applyClass(initial);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyClass(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore — storage may be blocked
    }
  }, []);

  const toggle = useCallback(() => {
    setTheme(theme === "dark" ? "light" : "dark");
  }, [theme, setTheme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // Outside provider — return inert defaults so callers don't crash during
    // SSR or storybook isolation.
    return {
      theme: "light",
      setTheme: () => {},
      toggle: () => {},
    };
  }
  return ctx;
}

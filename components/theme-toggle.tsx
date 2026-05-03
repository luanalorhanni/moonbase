"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const isDark = mounted && theme === "dark";

  return (
    <button
      type="button"
      aria-label={isDark ? "switch to light theme" : "switch to dark theme"}
      onClick={() => toggle()}
      className="border-border-strong text-muted-foreground hover:bg-card hover:text-foreground inline-flex size-8 items-center justify-center rounded-md border transition-colors"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-3.5" strokeWidth={1.6} />
        ) : (
          <Moon className="size-3.5" strokeWidth={1.6} />
        )
      ) : (
        <span className="size-3.5" />
      )}
    </button>
  );
}

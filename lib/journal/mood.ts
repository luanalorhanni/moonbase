import {
  Cloud,
  CloudRain,
  CloudSun,
  type LucideIcon,
  Sparkles,
  Sun,
} from "lucide-react";

/**
 * Climatic mood scale — five steps from a stormy day to a radiant
 * one. Stored as smallint 1–5 in `journal_entries.mood`. The scale is
 * intentionally calm: no faces, no harsh red/green, just the same
 * lunar/celestial palette the rest of the app uses.
 */
export type MoodLevel = 1 | 2 | 3 | 4 | 5;

export type MoodDescriptor = {
  value: MoodLevel;
  /** Single Portuguese word used as the user-facing label. */
  label: string;
  /** Lucide icon component for the swatch / preview. */
  icon: LucideIcon;
  /**
   * Tailwind text-color utility. The four warmer levels lean toward
   * primary/accent; the lowest level uses muted-foreground so it
   * doesn't shout (we don't want "bad day" to look alarming).
   */
  color: string;
};

export const MOODS: readonly MoodDescriptor[] = [
  { value: 1, label: "pesado", icon: CloudRain, color: "text-muted-foreground" },
  { value: 2, label: "nublado", icon: Cloud, color: "text-foreground/70" },
  { value: 3, label: "ameno", icon: CloudSun, color: "text-primary/80" },
  { value: 4, label: "luminoso", icon: Sun, color: "text-primary" },
  { value: 5, label: "radiante", icon: Sparkles, color: "text-accent" },
] as const;

/** Look up the descriptor for a given mood value, or null when unset. */
export function moodFor(value: number | null | undefined): MoodDescriptor | null {
  if (value === null || value === undefined) return null;
  return MOODS.find((m) => m.value === value) ?? null;
}

/** Type guard for narrowing arbitrary numbers from the DB. */
export function isMoodLevel(n: unknown): n is MoodLevel {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 5;
}

/**
 * Curated palette presets. Each preset overrides only the *expressive*
 * variables — the warm/cool neutrals (`--background`, `--foreground`,
 * `--muted`) stay constant so the system keeps its calm reading-app
 * character regardless of accent. Semantic colors (success, warning,
 * destructive) also stay fixed so financial signals don't change
 * meaning.
 *
 * Each preset declares two tokens (`primary` and `accent`) for both
 * light and dark modes; `--ring`, `--sidebar-primary`, the heatmap ramp
 * and the chart palette are derived from them at render time so a single
 * preset cascades naturally through the whole UI.
 */

export type PaletteTokens = {
  /** Light-mode triplet: primary / accent / focus ring (no alpha). */
  light: { primary: string; accent: string; ring: string };
  /** Dark-mode counterpart. */
  dark: { primary: string; accent: string; ring: string };
};

export type Palette = {
  id: string;
  name: string;
  /** One short line shown under the preset name. */
  description: string;
  tokens: PaletteTokens;
};

export const PALETTES: Palette[] = [
  {
    id: "lunar",
    name: "lunar",
    description: "lavender-grey + electric aqua — the original",
    tokens: {
      light: {
        primary: "oklch(0.55 0.05 265)",
        accent: "oklch(0.65 0.1 200)",
        ring: "oklch(0.62 0.1 200)",
      },
      dark: {
        primary: "oklch(0.86 0.08 200)",
        accent: "oklch(0.65 0.045 325)",
        ring: "oklch(0.86 0.08 200)",
      },
    },
  },
  {
    id: "rose",
    name: "rose",
    description: "soft rose + warm peach — gentle and morning-warm",
    tokens: {
      light: {
        primary: "oklch(0.6 0.13 5)",
        accent: "oklch(0.78 0.1 35)",
        ring: "oklch(0.72 0.13 10)",
      },
      dark: {
        primary: "oklch(0.78 0.13 5)",
        accent: "oklch(0.7 0.09 35)",
        ring: "oklch(0.78 0.13 5)",
      },
    },
  },
  {
    id: "forest",
    name: "forest",
    description: "deep moss + sage — quiet, grounded",
    tokens: {
      light: {
        primary: "oklch(0.5 0.08 155)",
        accent: "oklch(0.7 0.09 130)",
        ring: "oklch(0.6 0.1 145)",
      },
      dark: {
        primary: "oklch(0.78 0.11 155)",
        accent: "oklch(0.7 0.09 110)",
        ring: "oklch(0.78 0.11 155)",
      },
    },
  },
  {
    id: "ember",
    name: "ember",
    description: "burnt amber + soft gold — autumn, focused",
    tokens: {
      light: {
        primary: "oklch(0.55 0.12 50)",
        accent: "oklch(0.78 0.11 75)",
        ring: "oklch(0.66 0.13 60)",
      },
      dark: {
        primary: "oklch(0.78 0.12 60)",
        accent: "oklch(0.7 0.1 80)",
        ring: "oklch(0.78 0.12 60)",
      },
    },
  },
  {
    id: "violet",
    name: "violet",
    description: "electric violet + magenta — bold, kinetic",
    tokens: {
      light: {
        primary: "oklch(0.55 0.18 295)",
        accent: "oklch(0.7 0.16 330)",
        ring: "oklch(0.62 0.18 305)",
      },
      dark: {
        primary: "oklch(0.78 0.16 295)",
        accent: "oklch(0.72 0.13 330)",
        ring: "oklch(0.78 0.16 295)",
      },
    },
  },
  {
    id: "slate",
    name: "slate",
    description: "graphite + steel blue — minimal, editorial",
    tokens: {
      light: {
        primary: "oklch(0.4 0.02 265)",
        accent: "oklch(0.6 0.06 235)",
        ring: "oklch(0.5 0.05 245)",
      },
      dark: {
        primary: "oklch(0.85 0.02 265)",
        accent: "oklch(0.72 0.05 235)",
        ring: "oklch(0.85 0.02 265)",
      },
    },
  },
];

export const DEFAULT_PALETTE_ID = "lunar";

export function findPalette(id: string | null | undefined): Palette {
  if (!id) return PALETTES[0]!;
  return PALETTES.find((p) => p.id === id) ?? PALETTES[0]!;
}

/**
 * Build the inline CSS that overrides the global variables for the
 * given palette. Two scopes — `:root` for light mode, `.dark` for
 * dark — match the structure of `app/globals.css` so the user's
 * choice cascades through every component.
 *
 * The 0.55 alpha on `--ring` mirrors the default values in
 * globals.css; for the heatmap ramp we step down the chroma of the
 * accent so the palette change reads on the habits grid too.
 */
export function paletteCss(palette: Palette): string {
  const { light, dark } = palette.tokens;
  return [
    ":root {",
    `  --primary: ${light.primary};`,
    `  --accent: ${light.accent};`,
    `  --ring: color-mix(in oklab, ${light.ring} 55%, transparent);`,
    `  --sidebar-primary: ${light.primary};`,
    `  --sidebar-ring: color-mix(in oklab, ${light.ring} 55%, transparent);`,
    `  --star-bright: ${light.primary};`,
    `  --heatmap-1: color-mix(in oklab, ${light.accent} 35%, transparent);`,
    `  --heatmap-2: color-mix(in oklab, ${light.accent} 60%, transparent);`,
    `  --heatmap-3: ${light.accent};`,
    `  --heatmap-4: color-mix(in oklab, ${light.accent} 80%, ${light.primary});`,
    "}",
    ".dark {",
    `  --primary: ${dark.primary};`,
    `  --accent: ${dark.accent};`,
    `  --ring: color-mix(in oklab, ${dark.ring} 55%, transparent);`,
    `  --sidebar-primary: ${dark.primary};`,
    `  --sidebar-ring: color-mix(in oklab, ${dark.ring} 55%, transparent);`,
    `  --star-bright: ${dark.primary};`,
    `  --heatmap-1: color-mix(in oklab, ${dark.accent} 30%, transparent);`,
    `  --heatmap-2: color-mix(in oklab, ${dark.accent} 55%, transparent);`,
    `  --heatmap-3: ${dark.accent};`,
    `  --heatmap-4: color-mix(in oklab, ${dark.accent} 80%, ${dark.primary});`,
    "}",
  ].join("\n");
}

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
  /**
   * Light-mode triplet plus the surface tint:
   * - primary / accent / ring drive the expressive bits.
   * - tintHue / tintChroma steer the very subtle hue applied to the
   *   neutral surfaces (background, card, muted, sidebar) so the
   *   palette change is recognisable at a glance without breaking
   *   the warm-paper readability of the system.
   */
  light: {
    primary: string;
    accent: string;
    ring: string;
    tintHue: number;
    tintChroma: number;
  };
  /** Dark-mode counterpart. */
  dark: {
    primary: string;
    accent: string;
    ring: string;
    tintHue: number;
    tintChroma: number;
  };
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
        tintHue: 265,
        tintChroma: 0.022,
      },
      dark: {
        primary: "oklch(0.86 0.08 200)",
        accent: "oklch(0.65 0.045 325)",
        ring: "oklch(0.86 0.08 200)",
        tintHue: 280,
        tintChroma: 0.04,
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
        tintHue: 15,
        tintChroma: 0.028,
      },
      dark: {
        primary: "oklch(0.78 0.13 5)",
        accent: "oklch(0.7 0.09 35)",
        ring: "oklch(0.78 0.13 5)",
        tintHue: 15,
        tintChroma: 0.05,
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
        tintHue: 145,
        tintChroma: 0.025,
      },
      dark: {
        primary: "oklch(0.78 0.11 155)",
        accent: "oklch(0.7 0.09 110)",
        ring: "oklch(0.78 0.11 155)",
        tintHue: 145,
        tintChroma: 0.045,
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
        tintHue: 60,
        tintChroma: 0.028,
      },
      dark: {
        primary: "oklch(0.78 0.12 60)",
        accent: "oklch(0.7 0.1 80)",
        ring: "oklch(0.78 0.12 60)",
        tintHue: 60,
        tintChroma: 0.045,
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
        tintHue: 300,
        tintChroma: 0.03,
      },
      dark: {
        primary: "oklch(0.78 0.16 295)",
        accent: "oklch(0.72 0.13 330)",
        ring: "oklch(0.78 0.16 295)",
        tintHue: 300,
        tintChroma: 0.05,
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
        tintHue: 245,
        tintChroma: 0.018,
      },
      dark: {
        primary: "oklch(0.85 0.02 265)",
        accent: "oklch(0.72 0.05 235)",
        ring: "oklch(0.85 0.02 265)",
        tintHue: 245,
        tintChroma: 0.035,
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
/**
 * Build the inline CSS that overrides the global variables for the
 * given palette. Two scopes — `:root` for light mode, `.dark` for
 * dark — match the structure of `app/globals.css`.
 *
 * Beyond the expressive primary/accent tokens, we now also tint the
 * neutral surfaces (background, card, muted, secondary, sidebar,
 * border) toward the palette's hue. The chroma stays small (0.02–0.05)
 * so the system keeps its calm, paper-like readability — but it's
 * enough that swapping presets visibly recolours the whole canvas.
 *
 * Each L (lightness) value matches what globals.css uses for the
 * default `lunar` set so no preset darkens or lightens the system; we
 * only swap hue + nudge chroma.
 */
export function paletteCss(palette: Palette): string {
  const { light, dark } = palette.tokens;
  const lh = light.tintHue;
  const lc = light.tintChroma;
  const dh = dark.tintHue;
  const dc = dark.tintChroma;
  // Per-surface chroma multipliers — sidebar reads slightly stronger
  // than the main canvas so the rail is recognisably "in the palette".
  const surfaces = (h: number, c: number, dark: boolean) =>
    dark
      ? {
          background: `oklch(0.21 ${c} ${h})`,
          backgroundDeep: `oklch(0.16 ${c} ${h})`,
          card: `oklch(0.27 ${c * 0.85} ${h})`,
          popover: `oklch(0.29 ${c * 0.85} ${h})`,
          secondary: `oklch(0.31 ${c * 0.9} ${h})`,
          muted: `oklch(0.32 ${c * 0.9} ${h})`,
          input: `oklch(0.31 ${c * 0.9} ${h})`,
          sidebar: `oklch(0.24 ${c * 1.1} ${h})`,
          sidebarAccent: `oklch(0.30 ${c * 1.1} ${h})`,
        }
      : {
          background: `oklch(0.97 ${c} ${h})`,
          backgroundDeep: `oklch(0.93 ${c * 1.4} ${h})`,
          card: `oklch(0.995 ${c * 0.4} ${h})`,
          popover: `oklch(0.995 ${c * 0.4} ${h})`,
          secondary: `oklch(0.94 ${c * 1.1} ${h})`,
          muted: `oklch(0.95 ${c * 1.1} ${h})`,
          input: `oklch(0.95 ${c * 1.1} ${h})`,
          sidebar: `oklch(0.945 ${c * 1.4} ${h})`,
          sidebarAccent: `oklch(0.91 ${c * 1.6} ${h})`,
        };

  const ls = surfaces(lh, lc, false);
  const ds = surfaces(dh, dc, true);

  return [
    ":root {",
    `  --primary: ${light.primary};`,
    `  --accent: ${light.accent};`,
    `  --ring: color-mix(in oklab, ${light.ring} 55%, transparent);`,
    `  --background: ${ls.background};`,
    `  --background-deep: ${ls.backgroundDeep};`,
    `  --card: ${ls.card};`,
    `  --popover: ${ls.popover};`,
    `  --secondary: ${ls.secondary};`,
    `  --muted: ${ls.muted};`,
    `  --input: ${ls.input};`,
    `  --sidebar: ${ls.sidebar};`,
    `  --sidebar-accent: ${ls.sidebarAccent};`,
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
    `  --background: ${ds.background};`,
    `  --background-deep: ${ds.backgroundDeep};`,
    `  --card: ${ds.card};`,
    `  --popover: ${ds.popover};`,
    `  --secondary: ${ds.secondary};`,
    `  --muted: ${ds.muted};`,
    `  --input: ${ds.input};`,
    `  --sidebar: ${ds.sidebar};`,
    `  --sidebar-accent: ${ds.sidebarAccent};`,
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

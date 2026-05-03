/**
 * Pure helpers for parsing Spotify share URLs and building embed URLs.
 * Used by both the server action (validation) and the client component
 * (rendering).
 */

export type SpotifyEmbedKind = "playlist" | "album" | "track" | "show" | "episode" | "artist";

export const SPOTIFY_KINDS: SpotifyEmbedKind[] = [
  "playlist",
  "album",
  "track",
  "show",
  "episode",
  "artist",
];

export type SpotifyRef = {
  kind: SpotifyEmbedKind;
  id: string;
};

/**
 * Accepts canonical share URLs like:
 *   https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M?si=...
 *   https://open.spotify.com/intl-pt/album/3pQ.../
 *   spotify:track:6rqhFgbbKwnb9MLmUQDhG6
 *   https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M
 */
export function parseSpotifyUrl(input: string): SpotifyRef | null {
  const trimmed = input.trim();
  if (trimmed === "") return null;

  // Spotify URI form: spotify:type:id
  const uri = /^spotify:(playlist|album|track|show|episode|artist):([a-zA-Z0-9]+)$/i.exec(
    trimmed,
  );
  if (uri) return { kind: uri[1]!.toLowerCase() as SpotifyEmbedKind, id: uri[2]! };

  // Web URL: https://open.spotify.com/[intl-xx/](embed/)?type/id
  const url =
    /open\.spotify\.com\/(?:[a-z\-]+\/)?(?:embed\/)?(playlist|album|track|show|episode|artist)\/([a-zA-Z0-9]+)/i.exec(
      trimmed,
    );
  if (url) return { kind: url[1]!.toLowerCase() as SpotifyEmbedKind, id: url[2]! };

  return null;
}

export function buildEmbedUrl(ref: SpotifyRef): string {
  return `https://open.spotify.com/embed/${ref.kind}/${ref.id}?utm_source=generator&theme=0`;
}

/** Pretty label for display, e.g. "playlist · 37i9..." */
export function formatRef(ref: SpotifyRef): string {
  return `${ref.kind} · ${ref.id.slice(0, 6)}…`;
}

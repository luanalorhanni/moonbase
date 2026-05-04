"use client";

import { ImageIcon, Loader2, Search, X } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trackUnsplashDownload } from "@/lib/actions/user-settings";
import { cn } from "@/lib/utils";

export type UnsplashPhoto = {
  id: string;
  alt: string | null;
  thumbUrl: string;
  regularUrl: string;
  fullUrl: string;
  width: number;
  height: number;
  photographerName: string;
  photographerUrl: string;
  downloadLocation: string;
  color: string | null;
};

export type EntryCover = {
  url: string;
  thumbUrl: string;
  alt: string | null;
  photographerName: string;
  photographerUrl: string;
  unsplashId: string;
};

const SUGGESTIONS = ["moonlight", "calm sea", "morning fog", "soft pastel", "starlight"];

/**
 * Inline Unsplash cover picker for journal entries. Lives inside the
 * entry form (no nested dialog) — when no cover is set the user sees
 * the search box; once picked, a thumbnail with a "trocar capa"
 * affordance shows in its place.
 */
export function CoverPicker({
  value,
  onChange,
  disabled,
}: {
  value: EntryCover | null;
  onChange: (next: EntryCover | null) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startPickTransition] = useTransition();
  const [pickingId, setPickingId] = useState<string | null>(null);

  async function search(q: string) {
    const trimmed = q.trim();
    if (trimmed.length === 0) {
      setResults([]);
      setError(null);
      return;
    }
    setIsSearching(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/unsplash/search?q=${encodeURIComponent(trimmed)}&orientation=landscape`,
        { cache: "no-store" },
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? `error ${res.status}`);
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "error fetching.");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function pick(photo: UnsplashPhoto) {
    setPickingId(photo.id);
    startPickTransition(async () => {
      // Required by the Unsplash API guidelines — fires their
      // "download" tracking endpoint when a photo is actually used.
      try {
        await trackUnsplashDownload(photo.downloadLocation);
      } catch {
        // tracking is best-effort
      }
      onChange({
        url: photo.regularUrl,
        thumbUrl: photo.thumbUrl,
        alt: photo.alt,
        photographerName: photo.photographerName,
        photographerUrl: photo.photographerUrl,
        unsplashId: photo.id,
      });
      setPickingId(null);
      setOpen(false);
      setQuery("");
      setResults([]);
    });
  }

  if (value && !open) {
    return (
      <div className="border-border bg-muted/10 relative overflow-hidden rounded-lg border">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={value.url}
          alt={value.alt ?? ""}
          className="aspect-[16/7] w-full object-cover"
        />
        <div className="bg-background/80 absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 backdrop-blur-sm">
          <span className="text-muted-foreground/80 truncate font-mono text-[10px] tracking-wide">
            foto por{" "}
            <a
              href={value.photographerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              {value.photographerName}
            </a>{" "}
            · unsplash
          </span>
          <div className="flex shrink-0 gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setOpen(true)}
              disabled={disabled}
            >
              change
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => onChange(null)}
              disabled={disabled}
              className="text-muted-foreground hover:text-destructive"
            >
              <X aria-hidden className="size-3.5" />
              remove
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border-border bg-muted/10 flex flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center gap-2">
        <ImageIcon
          aria-hidden
          className="text-muted-foreground/70 size-4 shrink-0"
          strokeWidth={1.6}
        />
        <span className="text-muted-foreground/85 font-mono text-[10.5px] tracking-[0.16em] uppercase">
          day cover (optional)
        </span>
        {value && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="text-muted-foreground/70 hover:text-foreground ml-auto text-[11px]"
          >
            cancel
          </button>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search
            aria-hidden
            className="text-muted-foreground/60 absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2"
            strokeWidth={1.6}
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. moonlight, calm sea, morning fog"
            className="h-9 pl-8"
            disabled={disabled}
          />
        </div>
        <Button
          type="submit"
          size="sm"
          disabled={disabled || isSearching || query.trim().length === 0}
        >
          {isSearching ? <Loader2 aria-hidden className="size-3.5 animate-spin" /> : "search"}
        </Button>
      </form>

      <div className="flex flex-wrap gap-1.5">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            disabled={disabled}
            onClick={() => {
              setQuery(s);
              search(s);
            }}
            className="border-border text-muted-foreground/85 hover:bg-muted/40 hover:text-foreground rounded-full border px-2.5 py-1 text-[10.5px] transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-destructive text-[12px]">{error}</p>
      )}

      {results.length > 0 && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {results.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => pick(photo)}
              disabled={disabled || pickingId === photo.id}
              className={cn(
                "group border-border relative aspect-[4/3] overflow-hidden rounded-md border transition-all hover:scale-[1.02]",
                pickingId === photo.id && "opacity-50",
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={photo.thumbUrl}
                alt={photo.alt ?? ""}
                style={{ backgroundColor: photo.color ?? undefined }}
                className="size-full object-cover transition-opacity group-hover:opacity-90"
                loading="lazy"
                decoding="async"
              />
              {pickingId === photo.id && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Loader2 aria-hidden className="size-5 animate-spin text-white" />
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

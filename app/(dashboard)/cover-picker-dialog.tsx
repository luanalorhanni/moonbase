"use client";

import { Image as ImageIcon, Loader2, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setHomeCover, trackUnsplashDownload } from "@/lib/actions/user-settings";
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

const SUGGESTIONS = ["moonlight", "soft pastel", "cozy reading", "morning fog", "garden"];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CoverPickerDialog({ open, onOpenChange }: Props) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<UnsplashPhoto[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, startSaveTransition] = useTransition();
  const [savingId, setSavingId] = useState<string | null>(null);

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
        setError(data.error ?? `Erro ${res.status}`);
        setResults([]);
        return;
      }
      setResults(data.results ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "failed to search images");
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  }

  function pick(photo: UnsplashPhoto) {
    startSaveTransition(async () => {
      setSavingId(photo.id);
      // Required by Unsplash API guidelines — fires the download
      // tracking endpoint before we persist the choice.
      await trackUnsplashDownload(photo.downloadLocation);
      const result = await setHomeCover({
        url: photo.fullUrl,
        thumbUrl: photo.regularUrl,
        alt: photo.alt,
        photographerName: photo.photographerName,
        photographerUrl: photo.photographerUrl,
        unsplashId: photo.id,
      });
      setSavingId(null);
      if (result.ok) {
        toast.success("cover updated.");
        router.refresh();
        onOpenChange(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void search(query);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImageIcon aria-hidden className="size-4" strokeWidth={1.6} />
            change home cover
          </DialogTitle>
          <DialogDescription>
            powered by unsplash · search any vibe and click a photo to set it as your home
            cover. photographers are credited automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search
              aria-hidden
              className="text-muted-foreground/60 pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2"
            />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex: moon, mountains, calm, library"
              autoFocus
              className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-md border pr-3 pl-9 text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex h-10 items-center gap-1.5 rounded-md px-4 text-[13px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSearching ? (
              <Loader2 className="size-3.5 animate-spin" strokeWidth={1.8} aria-hidden />
            ) : (
              <Search className="size-3.5" strokeWidth={1.8} aria-hidden />
            )}
            search
          </button>
        </form>

        {/* Suggestion chips */}
        {results.length === 0 && !isSearching && !error && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-muted-foreground/70 inline-flex items-center gap-1 font-mono text-[10.5px] tracking-wider uppercase">
              <Sparkles aria-hidden className="size-3" strokeWidth={1.6} />
              try
            </span>
            {SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  setQuery(s);
                  void search(s);
                }}
                className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground rounded-full border px-2.5 py-1 text-[11.5px] transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {error && (
          <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-[12.5px]">
            {error}
            {error.toLowerCase().includes("unsplash_access_key") && (
              <span className="text-destructive/80 mt-1 block font-mono text-[11px]">
                add `UNSPLASH_ACCESS_KEY=...` to .env.local — get yours at{" "}
                <span className="underline">unsplash.com/developers</span>
              </span>
            )}
          </p>
        )}

        {/* Results grid */}
        {results.length > 0 && (
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {results.map((photo) => {
              const saving = savingId === photo.id;
              return (
                <li key={photo.id}>
                  <button
                    type="button"
                    onClick={() => pick(photo)}
                    disabled={isSaving}
                    aria-label={`use photo by ${photo.photographerName}`}
                    className={cn(
                      "group ring-border hover:ring-primary/60 relative block aspect-[4/3] w-full overflow-hidden rounded-md ring-1 transition-all hover:ring-2 disabled:opacity-50",
                      saving && "ring-primary/60 ring-2",
                    )}
                    style={{ backgroundColor: photo.color ?? "var(--muted)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.thumbUrl}
                      alt={photo.alt ?? `photo by ${photo.photographerName}`}
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 text-left">
                      <span className="block truncate font-mono text-[10px] tracking-wider text-white/80">
                        {photo.photographerName}
                      </span>
                    </span>
                    {saving && (
                      <span className="bg-background/60 absolute inset-0 flex items-center justify-center backdrop-blur-sm">
                        <Loader2
                          aria-hidden
                          className="text-primary size-5 animate-spin"
                          strokeWidth={1.8}
                        />
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {results.length === 0 && isSearching && (
          <div className="flex h-[200px] items-center justify-center">
            <Loader2
              aria-hidden
              className="text-muted-foreground size-6 animate-spin"
              strokeWidth={1.6}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

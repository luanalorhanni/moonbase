"use client";

import { Music, Pencil, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { setHomeSpotifyUrl } from "@/lib/actions/user-settings";
import { buildEmbedUrl, parseSpotifyUrl } from "@/lib/spotify";

type Props = {
  url: string | null;
};

/**
 * Spotify embed block for the home page. When set, renders the
 * `iframe` embed; when unset, shows a discreet placeholder card the
 * user can click to attach a playlist/album/track. Always includes an
 * edit button to swap the embed.
 */
export function SpotifyEmbed({ url }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);

  const ref = url ? parseSpotifyUrl(url) : null;
  const embedUrl = ref ? buildEmbedUrl(ref) : null;

  return (
    <section className="flex flex-col gap-3">
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-foreground text-[24px] leading-none font-light tracking-tight italic">
            vibe
          </h2>
          <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-[0.2em] uppercase">
            soundtrack of the moment
          </span>
        </div>
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="border-border-strong text-muted-foreground hover:bg-muted hover:text-foreground inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 font-mono text-[10.5px] tracking-wider transition-colors"
        >
          <Pencil aria-hidden className="size-3" strokeWidth={1.6} />
          {url ? "change" : "add"}
        </button>
      </header>

      {embedUrl ? (
        <div className="border-border/50 overflow-hidden rounded-xl border shadow-sm">
          {/* Spotify recommends the compact 152px height for headers, 352px
              for full track-listing view. We pick 152 for "ambient
              presence" — reads as a strip, not a focus-grabbing widget. */}
          <iframe
            key={embedUrl}
            title="spotify embed"
            src={embedUrl}
            width="100%"
            height={152}
            frameBorder={0}
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            className="block"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setDialogOpen(true)}
          className="border-border/60 bg-card/40 hover:border-primary/40 hover:bg-primary/[0.04] flex h-[120px] w-full items-center justify-center gap-3 rounded-xl border border-dashed transition-colors"
        >
          <Music className="text-muted-foreground/60 size-4" strokeWidth={1.6} aria-hidden />
          <span className="text-muted-foreground/80 text-[13px]">
            paste a spotify track, album, or playlist to set the vibe
          </span>
          <Plus className="text-muted-foreground/60 size-3.5" strokeWidth={1.8} aria-hidden />
        </button>
      )}

      <SpotifyDialog open={dialogOpen} onOpenChange={setDialogOpen} currentUrl={url} />
    </section>
  );
}

function SpotifyDialog({
  open,
  onOpenChange,
  currentUrl,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentUrl: string | null;
}) {
  const router = useRouter();
  const [value, setValue] = useState(currentUrl ?? "");
  const [isSaving, startSaveTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Live preview if the input parses
  const ref = parseSpotifyUrl(value);
  const previewUrl = ref ? buildEmbedUrl(ref) : null;

  function handleSave() {
    startSaveTransition(async () => {
      const result = await setHomeSpotifyUrl(value);
      if (result.ok) {
        toast.success(value.trim() === "" ? "embed removed." : "embed updated.");
        router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  function handleClear() {
    startSaveTransition(async () => {
      const result = await setHomeSpotifyUrl(null);
      if (result.ok) {
        toast.success("embed removed.");
        setValue("");
        router.refresh();
        onOpenChange(false);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Music aria-hidden className="size-4" strokeWidth={1.6} />
            spotify embed
          </DialogTitle>
          <DialogDescription>
            paste a spotify URL (playlist, album, track, podcast, episode, or artist). the embed is
            public — no login required.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <input
            type="url"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setError(null);
            }}
            placeholder="https://open.spotify.com/track/... or /playlist/..."
            className="border-input bg-background placeholder:text-muted-foreground/60 focus-visible:border-ring focus-visible:ring-ring/40 h-10 w-full rounded-md border px-3 text-[13.5px] transition-colors focus-visible:ring-2 focus-visible:outline-none"
            autoFocus
          />
          {value && !ref && (
            <p className="text-destructive text-[11.5px]">
              couldn&apos;t parse this — check the link is from spotify.
            </p>
          )}
          {error && (
            <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-md border px-3 py-2 text-[12px]">
              {error}
            </p>
          )}
        </div>

        {previewUrl && (
          <div className="border-border/50 overflow-hidden rounded-md border">
            <iframe
              key={previewUrl}
              title="preview"
              src={previewUrl}
              width="100%"
              height={152}
              frameBorder={0}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
              className="block"
            />
          </div>
        )}

        <DialogFooter className="flex items-center justify-between gap-2">
          {currentUrl && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleClear}
              disabled={isSaving}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 aria-hidden className="size-3.5" />
              remove
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              cancel
            </Button>
            <Button type="button" onClick={handleSave} disabled={isSaving || !ref}>
              {isSaving ? "saving..." : "save"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

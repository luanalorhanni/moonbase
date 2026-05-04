"use client";

import { Loader2, Quote, RefreshCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

const CACHE_KEY = "moonbase-daily-verse";
const FALLBACK = {
  text: "small steps, kept consistently, build the life you want.",
  reference: "moonbase",
};

type Verse = {
  /** yyyy-mm-dd of when the verse was cached. */
  date: string;
  text: string;
  /** "João 3:16" — pre-formatted display string. */
  reference: string;
};

function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * Daily Bible verse from bible-api.com — first visit of the day fetches
 * a random Almeida verse and caches it in localStorage. Subsequent
 * visits the same day reuse the cache so the verse stays stable from
 * morning to night. The refresh button bypasses the cache.
 */
export function DailyVerse() {
  const [verse, setVerse] = useState<Verse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchVerse = useCallback(async (writeCache: boolean) => {
    try {
      const res = await fetch("https://bible-api.com/data/almeida/random", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`bible-api ${res.status}`);
      const data = (await res.json()) as {
        random_verse?: {
          book: string;
          chapter: number;
          verse: number;
          text: string;
        };
      };
      if (!data.random_verse) throw new Error("missing random_verse");
      const v = data.random_verse;
      const next: Verse = {
        date: todayIso(),
        text: v.text.trim(),
        reference: `${v.book} ${v.chapter}:${v.verse}`,
      };
      setVerse(next);
      if (writeCache) {
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(next));
        } catch {
          // storage may be blocked
        }
      }
    } catch {
      // Soft fail — show the static fallback so the hero still renders.
      setVerse({ date: todayIso(), ...FALLBACK });
    }
  }, []);

  useEffect(() => {
    const today = todayIso();
    let used = false;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as Verse;
        if (cached.date === today && typeof cached.text === "string") {
          setVerse(cached);
          setIsLoading(false);
          used = true;
        }
      }
    } catch {
      // ignore
    }
    if (!used) {
      fetchVerse(true).finally(() => setIsLoading(false));
    }
  }, [fetchVerse]);

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {
      // ignore
    }
    await fetchVerse(true);
    setIsRefreshing(false);
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 font-mono text-[11px] tracking-wider text-white/40">
        <Loader2 className="size-3.5 animate-spin" strokeWidth={1.6} aria-hidden />
        loading verse…
      </div>
    );
  }

  if (!verse) return null;

  return (
    <blockquote className="animate-in fade-in slide-in-from-bottom-2 max-w-2xl duration-1000">
      <div className="flex items-start gap-3">
        <Quote aria-hidden className="mt-1 size-4 shrink-0 text-white/40" strokeWidth={1.5} />
        <p className="font-display text-[16px] leading-relaxed font-light text-white/85 italic md:text-[18px]">
          {verse.text}
        </p>
      </div>
      <div className="mt-2 ml-7 flex items-center gap-3">
        <cite className="block font-mono text-[10.5px] tracking-[0.18em] text-white/55 uppercase not-italic">
          {verse.reference}
        </cite>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isRefreshing}
          aria-label="new verse"
          className="inline-flex size-5 items-center justify-center rounded-md text-white/40 transition-colors hover:text-white/80 disabled:opacity-50"
        >
          <RefreshCcw
            aria-hidden
            strokeWidth={1.6}
            className={isRefreshing ? "size-3 animate-spin" : "size-3"}
          />
        </button>
      </div>
    </blockquote>
  );
}

"use client";

import {
  ArrowDownToLine,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  CalendarRange,
  CircleCheckBig,
  CreditCard,
  HandCoins,
  Image as ImageIcon,
  Palette,
  PiggyBank,
  Quote,
  ReceiptText,
  Repeat,
  Tag,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import {
  PixelMoonCrescent,
  PixelMoonFull,
  PixelStarSmall,
} from "@/components/decorative/pixel-icons";
import type { UserSettingsRow } from "@/lib/queries/user-settings";
import { cn } from "@/lib/utils";

import { CoverPickerDialog } from "./cover-picker-dialog";
import { DailyVerse } from "./daily-verse";
import { SpotifyEmbed } from "./spotify-embed";

type Card = {
  href: string;
  label: string;
  description: string;
  icon: typeof CalendarDays;
  /** Aqua / mauve / sand / mint / coral — drives the gradient. */
  tone: "aqua" | "mauve" | "sand" | "mint" | "coral";
};

const ROUTINE_CARDS: Card[] = [
  {
    href: "/habits",
    label: "habits",
    description: "daily and weekly routines",
    icon: CircleCheckBig,
    tone: "mint",
  },
];

const FINANCE_CARDS: Card[] = [
  {
    href: "/month",
    label: "month",
    description: "this month at a glance",
    icon: CalendarRange,
    tone: "aqua",
  },
  {
    href: "/year",
    label: "year",
    description: "annual ledger and trends",
    icon: CalendarDays,
    tone: "mauve",
  },
  {
    href: "/investments",
    label: "investments",
    description: "savings and bonds",
    icon: PiggyBank,
    tone: "sand",
  },
  {
    href: "/receivables",
    label: "receivables",
    description: "amounts owed to you",
    icon: HandCoins,
    tone: "mauve",
  },
];

const REGISTER_CARDS: Card[] = [
  {
    href: "/expenses/cash",
    label: "cash expenses",
    description: "pix · debit · cash",
    icon: Banknote,
    tone: "aqua",
  },
  {
    href: "/expenses/credit",
    label: "credit expenses",
    description: "card installments",
    icon: ReceiptText,
    tone: "mauve",
  },
  {
    href: "/expenses/fixed",
    label: "recurring",
    description: "subscriptions, rent, bills",
    icon: Repeat,
    tone: "sand",
  },
  {
    href: "/incomes",
    label: "incomes",
    description: "salaries, grants, sales",
    icon: ArrowDownToLine,
    tone: "mint",
  },
];

const CONFIG_CARDS: Card[] = [
  {
    href: "/cards",
    label: "cards",
    description: "credit + accounts",
    icon: CreditCard,
    tone: "aqua",
  },
  {
    href: "/categories",
    label: "categories",
    description: "classify expenses",
    icon: Tag,
    tone: "mauve",
  },
  {
    href: "/palette",
    label: "palette",
    description: "system color story",
    icon: Palette,
    tone: "sand",
  },
];

const TONE_CLASSES: Record<Card["tone"], string> = {
  aqua: "from-[oklch(0.78_0.10_200/0.18)] to-[oklch(0.78_0.10_200/0.04)] hover:from-[oklch(0.78_0.10_200/0.30)] group-hover:ring-[oklch(0.65_0.10_200/0.35)]",
  mauve:
    "from-[oklch(0.65_0.06_325/0.16)] to-[oklch(0.65_0.06_325/0.04)] hover:from-[oklch(0.65_0.06_325/0.28)] group-hover:ring-[oklch(0.55_0.06_325/0.35)]",
  sand: "from-[oklch(0.78_0.06_70/0.16)] to-[oklch(0.78_0.06_70/0.04)] hover:from-[oklch(0.78_0.06_70/0.28)] group-hover:ring-[oklch(0.62_0.10_70/0.35)]",
  mint: "from-[oklch(0.74_0.13_160/0.16)] to-[oklch(0.74_0.13_160/0.04)] hover:from-[oklch(0.74_0.13_160/0.28)] group-hover:ring-[oklch(0.55_0.13_160/0.35)]",
  coral:
    "from-[oklch(0.62_0.18_25/0.16)] to-[oklch(0.62_0.18_25/0.04)] hover:from-[oklch(0.62_0.18_25/0.28)] group-hover:ring-[oklch(0.55_0.18_25/0.35)]",
};

const ICON_TONE: Record<Card["tone"], string> = {
  aqua: "text-[oklch(0.55_0.14_200)]",
  mauve: "text-[oklch(0.55_0.06_325)]",
  sand: "text-[oklch(0.62_0.10_70)]",
  mint: "text-[oklch(0.55_0.13_160)]",
  coral: "text-[oklch(0.55_0.18_25)]",
};

function timeBasedGreeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "still up?";
  if (h < 12) return "good morning";
  if (h < 18) return "good afternoon";
  if (h < 22) return "good evening";
  return "late night, take care";
}

/**
 * Picks between full and crescent moon based on the day of the month —
 * gives a tiny "lunar phase" tease without computing real ephemerides.
 * Even days = full, odd days = crescent.
 */
function MoonForToday() {
  const day = new Date().getDate();
  const Glyph = day % 2 === 0 ? PixelMoonFull : PixelMoonCrescent;
  return (
    <span className="relative inline-block shrink-0">
      <Glyph size={48} className="text-white drop-shadow-[0_0_18px_oklch(0.65_0.10_200/0.85)]" />
      <PixelStarSmall size={5} className="absolute -top-1 -right-1.5 animate-pulse text-white/90" />
    </span>
  );
}

export function HomePage({ settings }: { settings: UserSettingsRow | null }) {
  const [coverPickerOpen, setCoverPickerOpen] = useState(false);

  const coverUrl = settings?.homeCoverUrl ?? null;
  const photographerName = settings?.homeCoverPhotographerName;
  const photographerUrl = settings?.homeCoverPhotographerUrl;
  const customQuote = settings?.homeQuote ?? null;
  const customQuoteAuthor = settings?.homeQuoteAuthor;
  const greeting = timeBasedGreeting();

  return (
    <div className="enter flex h-full min-h-0 flex-col overflow-auto">
      {/* ── HERO ───────────────────────────────────────────────────── */}
      <section className="relative isolate flex shrink-0 flex-col justify-end overflow-hidden bg-slate-300 dark:bg-[#0b0d18]">
        {/* Cover background — kept softly translucent so the dark base
            and the shooting-star layer above it can read through. */}
        <div aria-hidden className="absolute inset-0 -z-10">
          {coverUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={coverUrl}
              alt={settings?.homeCoverAlt ?? ""}
              className="h-full w-full object-cover opacity-60"
            />
          ) : (
            <div
              className="h-full w-full opacity-70"
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.78 0.10 200) 0%, oklch(0.65 0.06 325) 60%, oklch(0.78 0.06 70) 100%)",
              }}
            />
          )}
          {/* Theme-aware overlay sits above the cover, beneath the stars/content.
              Light: whitish-gray fade. Dark: deep blue-black (background tone) so it
              doesn't read as a flat pure-black block against the dark theme. */}
          <div className="dark:from-background/90 dark:via-background/55 dark:to-background/65 absolute inset-0 bg-gradient-to-t from-slate-700/70 via-slate-500/35 to-slate-400/35" />
        </div>

        {/* Hero starfield — twinkles + 4 staggered shooting stars */}
        <div className="hero-stars" aria-hidden>
          <span className="hero-comet hero-comet-1" />
          <span className="hero-comet hero-comet-2" />
          <span className="hero-comet hero-comet-3" />
          <span className="hero-comet hero-comet-4" />
        </div>

        <div className="relative flex min-h-[440px] flex-col justify-end gap-5 px-8 pt-16 pb-8 md:min-h-[520px] md:px-12 md:pt-24 md:pb-12">
          <div className="animate-in fade-in slide-in-from-bottom-4 flex flex-col gap-2 duration-700">
            <span className="flex items-center gap-2 font-mono text-[11px] tracking-[0.32em] text-white/70 uppercase">
              <PixelStarSmall size={5} className="text-white" />
              moonbase
            </span>
            <h1 className="font-display flex flex-wrap items-center gap-x-4 gap-y-2 leading-none tracking-[-0.04em] text-white">
              <MoonForToday />
              <span className="text-[44px] font-light italic md:text-[72px]">{greeting}</span>
              <span className="font-display text-[20px] font-light text-white/60 italic md:text-[26px]">
                luana
              </span>
            </h1>
          </div>

          {customQuote ? (
            <blockquote className="animate-in fade-in slide-in-from-bottom-2 max-w-2xl duration-1000">
              <p className="font-display flex items-start gap-3 text-[16px] leading-relaxed font-light text-white/85 italic md:text-[18px]">
                <Quote
                  aria-hidden
                  className="mt-1 size-4 shrink-0 text-white/40"
                  strokeWidth={1.5}
                />
                <span>{customQuote}</span>
              </p>
              {customQuoteAuthor && (
                <cite className="mt-2 ml-7 block font-mono text-[10.5px] tracking-[0.18em] text-white/55 uppercase not-italic">
                  — {customQuoteAuthor}
                </cite>
              )}
            </blockquote>
          ) : (
            <DailyVerse />
          )}

          {/* Cover attribution + change button */}
          <div className="mt-2 flex items-center justify-between gap-3">
            <span className="font-mono text-[10px] tracking-wider text-white/50">
              {photographerName ? (
                <>
                  photo by{" "}
                  <a
                    href={`${photographerUrl}?utm_source=moonbase&utm_medium=referral`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-white/80 hover:underline"
                  >
                    {photographerName}
                  </a>{" "}
                  on{" "}
                  <a
                    href="https://unsplash.com/?utm_source=moonbase&utm_medium=referral"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline-offset-2 hover:text-white/80 hover:underline"
                  >
                    unsplash
                  </a>
                </>
              ) : (
                "default cover"
              )}
            </span>
            <button
              type="button"
              onClick={() => setCoverPickerOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-[11.5px] text-white backdrop-blur-md transition-colors hover:border-white/40 hover:bg-white/20"
            >
              <ImageIcon aria-hidden className="size-3" strokeWidth={1.6} />
              change cover
            </button>
          </div>
        </div>
      </section>

      {/* ── SECTIONS ───────────────────────────────────────────────── */}
      <div className="relative flex flex-col px-6 py-10 md:px-10 md:py-14">
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-700"
          style={{ animationDelay: "50ms", animationFillMode: "both" }}
        >
          <SpotifyEmbed url={settings?.homeSpotifyUrl ?? null} />
        </div>
        <SectionDivider />
        <SectionGrid
          title="routines"
          caption="routines and rituals"
          cards={ROUTINE_CARDS}
          delay={150}
        />
        <SectionDivider />
        <SectionGrid title="finance control" caption="overview" cards={FINANCE_CARDS} delay={250} />
        <SectionDivider />
        <SectionGrid
          title="finance register"
          caption="ins and outs"
          cards={REGISTER_CARDS}
          delay={350}
        />
        <SectionDivider />
        <SectionGrid
          title="config"
          caption="system settings"
          cards={CONFIG_CARDS}
          delay={450}
          compact
        />
      </div>

      <CoverPickerDialog open={coverPickerOpen} onOpenChange={setCoverPickerOpen} />
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────── */

/**
 * Subtle horizontal divider used between hero, spotify, and the
 * various redirect grids on the home page. Fades in from transparent
 * to a hairline border and back so it feels less like a hard rule.
 */
function SectionDivider() {
  return (
    <div
      aria-hidden
      className="my-10 h-px bg-gradient-to-r from-transparent via-[color-mix(in_oklab,var(--border)_60%,transparent)] to-transparent md:my-12"
    />
  );
}

function SectionGrid({
  title,
  caption,
  cards,
  delay,
  compact,
}: {
  title: string;
  caption: string;
  cards: Card[];
  delay: number;
  compact?: boolean;
}) {
  return (
    <section
      className="animate-in fade-in slide-in-from-bottom-2 flex flex-col gap-4 duration-700"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "both" }}
    >
      <header className="flex items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-3">
          <h2 className="font-display text-foreground text-[24px] leading-none font-light tracking-tight italic">
            {title}
          </h2>
          <span className="text-muted-foreground/70 font-mono text-[10.5px] tracking-[0.2em] uppercase">
            {caption}
          </span>
        </div>
      </header>
      <div
        className={cn(
          "grid gap-3",
          compact
            ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-6"
            : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        )}
      >
        {cards.map((card) => (
          <RedirectCard key={card.href} card={card} compact={compact} />
        ))}
      </div>
    </section>
  );
}

function RedirectCard({ card, compact }: { card: Card; compact?: boolean }) {
  const Icon = card.icon;
  return (
    <Link
      href={card.href}
      className={cn(
        "group ring-border-strong relative isolate overflow-hidden rounded-xl ring-1 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg",
        compact ? "p-4" : "p-5",
      )}
    >
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 -z-10 bg-gradient-to-br transition-opacity duration-300",
          TONE_CLASSES[card.tone],
        )}
      />
      <div
        aria-hidden
        className="absolute -top-12 -right-12 -z-10 size-32 rounded-full bg-white/30 opacity-0 blur-3xl transition-opacity duration-300 group-hover:opacity-60 dark:bg-white/10"
      />
      <div className="relative flex h-full flex-col gap-2.5">
        <div className="flex items-start justify-between gap-2">
          <Icon
            aria-hidden
            strokeWidth={1.5}
            className={cn(
              "size-6 transition-transform duration-300 group-hover:scale-110",
              ICON_TONE[card.tone],
              compact && "size-5",
            )}
          />
          <ArrowUpRight
            aria-hidden
            strokeWidth={1.5}
            className="text-muted-foreground/50 size-3.5 -translate-x-1 translate-y-1 opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:translate-y-0 group-hover:opacity-100"
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <h3
            className={cn(
              "text-foreground font-medium tracking-tight",
              compact ? "text-[14px]" : "text-[15px]",
            )}
          >
            {card.label}
          </h3>
          {!compact && (
            <p className="text-muted-foreground/85 text-[12px] leading-snug">{card.description}</p>
          )}
        </div>
      </div>
    </Link>
  );
}

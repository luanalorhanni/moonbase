"use client";

import { LogOut } from "lucide-react";
import { useState, useTransition } from "react";

import { signOut } from "@/lib/actions/auth";
import { useSidebarCollapse } from "@/lib/dashboard/sidebar-context";
import { cn } from "@/lib/utils";

type Props = {
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * Compact user chip in the sidebar footer.
 *
 * Renders both the expanded row (avatar + name + logout) and the
 * collapsed column (avatar stacked over logout) at the same time, but
 * cross-fades between them via opacity so the toggle feels continuous
 * instead of popping. The avatar itself stays anchored in the same
 * spot in both layouts so the eye has something stable to track.
 */
export function SidebarUser({ email, name, avatarUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [imgFailed, setImgFailed] = useState(false);
  const { collapsed } = useSidebarCollapse();

  const display = name ?? email ?? "—";
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();
  const showImage = !!avatarUrl && !imgFailed;

  function handleSignOut() {
    startTransition(() => signOut());
  }

  return (
    <div
      className={cn(
        "relative w-full transition-[min-height] duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
        // Row: avatar (28px) only — no need for extra height.
        // Column: avatar + 8px gap + logout (28px) = 64px.
        collapsed ? "min-h-[64px]" : "min-h-[28px]",
      )}
    >
      {/* Expanded row */}
      <div
        aria-hidden={collapsed}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-2.5 transition-opacity duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          collapsed && "pointer-events-none opacity-0",
        )}
      >
        <Avatar
          showImage={showImage}
          avatarUrl={avatarUrl}
          initial={initial}
          alt={display}
          onError={() => setImgFailed(true)}
        />
        <span
          className="text-foreground/85 min-w-0 flex-1 truncate text-[12px] font-medium leading-tight"
          title={email ?? undefined}
        >
          {display}
        </span>
        <LogoutButton onClick={handleSignOut} disabled={isPending} />
      </div>

      {/* Collapsed column — overlays the row, only opacity differs. */}
      <div
        aria-hidden={!collapsed}
        className={cn(
          "absolute inset-0 flex flex-col items-center gap-2 transition-opacity duration-300 ease-[cubic-bezier(0.2,0.7,0.2,1)]",
          !collapsed && "pointer-events-none opacity-0",
        )}
      >
        <span title={display}>
          <Avatar
            showImage={showImage}
            avatarUrl={avatarUrl}
            initial={initial}
            alt={display}
            onError={() => setImgFailed(true)}
          />
        </span>
        <LogoutButton onClick={handleSignOut} disabled={isPending} />
      </div>
    </div>
  );
}

function LogoutButton({ onClick, disabled }: { onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title="sair"
      aria-label="sair"
      className="text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
    >
      <LogOut aria-hidden className="size-3.5" strokeWidth={1.6} />
    </button>
  );
}

function Avatar({
  showImage,
  avatarUrl,
  initial,
  alt,
  onError,
}: {
  showImage: boolean;
  avatarUrl: string | null;
  initial: string;
  alt: string;
  onError: () => void;
}) {
  return (
    <span
      aria-hidden={!showImage}
      className={cn(
        "ring-border/60 relative inline-flex size-7 shrink-0 items-center justify-center overflow-hidden rounded-full ring-1",
        !showImage && "bg-primary/15 text-primary",
      )}
    >
      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl!}
          alt={alt}
          width={28}
          height={28}
          referrerPolicy="no-referrer"
          loading="lazy"
          decoding="async"
          onError={onError}
          className="size-full object-cover"
        />
      ) : (
        <span className="font-mono text-[11px] font-semibold tracking-tight">{initial}</span>
      )}
    </span>
  );
}

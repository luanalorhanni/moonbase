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
 * Compact user chip in the sidebar footer:
 *   [avatar]  name (or email)        [logout]
 *
 * The avatar falls back to a primary-tinted circle with the user's
 * first initial when no Google picture is available (email + password
 * users).
 */
export function SidebarUser({ email, name, avatarUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [imgFailed, setImgFailed] = useState(false);
  const { collapsed } = useSidebarCollapse();

  const display = name ?? email ?? "—";
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();
  const showImage = !!avatarUrl && !imgFailed;

  if (collapsed) {
    // Vertical stack: avatar on top, logout button below. Tooltips
    // surface the user's name and the action label.
    return (
      <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
        <span title={display}>
          <Avatar
            showImage={showImage}
            avatarUrl={avatarUrl}
            initial={initial}
            alt={display}
            onError={() => setImgFailed(true)}
          />
        </span>
        <button
          type="button"
          onClick={() => startTransition(() => signOut())}
          disabled={isPending}
          title="sair"
          aria-label="sair"
          className="text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
        >
          <LogOut aria-hidden className="size-3.5" strokeWidth={1.6} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
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
      <button
        type="button"
        onClick={() => startTransition(() => signOut())}
        disabled={isPending}
        title="sair"
        aria-label="sair"
        className="text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
      >
        <LogOut aria-hidden className="size-3.5" strokeWidth={1.6} />
      </button>
    </div>
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

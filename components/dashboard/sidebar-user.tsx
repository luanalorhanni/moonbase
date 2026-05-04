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

export function SidebarUser({ email, name, avatarUrl }: Props) {
  const [isPending, startTransition] = useTransition();
  const [imgFailed, setImgFailed] = useState(false);
  const { collapsed } = useSidebarCollapse();

  const display = name ?? email ?? "—";
  const initial = (name ?? email ?? "?").trim().charAt(0).toUpperCase();
  const showImage = !!avatarUrl && !imgFailed;

  const avatar = (
    <Avatar
      showImage={showImage}
      avatarUrl={avatarUrl}
      initial={initial}
      alt={display}
      onError={() => setImgFailed(true)}
    />
  );
  const logout = (
    <button
      type="button"
      onClick={() => startTransition(() => signOut())}
      disabled={isPending}
      title="sign out"
      aria-label="sign out"
      className="text-muted-foreground/70 hover:bg-sidebar-accent hover:text-foreground inline-flex size-7 shrink-0 items-center justify-center rounded-md transition-colors disabled:opacity-50"
    >
      <LogOut aria-hidden className="size-3.5" strokeWidth={1.6} />
    </button>
  );

  if (collapsed) {
    return (
      <div className="flex flex-col items-center gap-2">
        <span title={display}>{avatar}</span>
        {logout}
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2.5">
      {avatar}
      <span
        className="text-foreground/85 min-w-0 flex-1 truncate text-[12px] font-medium leading-tight"
        title={email ?? undefined}
      >
        {display}
      </span>
      {logout}
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

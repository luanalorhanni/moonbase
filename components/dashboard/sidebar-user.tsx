"use client";

import { LogOut } from "lucide-react";
import { useTransition } from "react";

import { signOut } from "@/lib/actions/auth";

type Props = {
  email: string | null;
};

export function SidebarUser({ email }: Props) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex min-w-0 flex-1 items-center gap-2">
      <span
        className="text-muted-foreground/70 min-w-0 flex-1 truncate font-mono text-[11px] tracking-[0.12em]"
        title={email ?? undefined}
      >
        {email ?? "—"}
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

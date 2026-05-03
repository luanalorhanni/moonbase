import { Moon } from "lucide-react";

import { LoginForm } from "./login-form";

export const metadata = {
  title: "entrar · moonbase",
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const sp = await searchParams;
  return (
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16">
      <div className="border-border/60 bg-card/40 flex w-full max-w-sm flex-col gap-7 rounded-2xl border px-7 py-9 shadow-xl backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="bg-primary/10 text-primary flex size-12 items-center justify-center rounded-full">
            <Moon aria-hidden className="size-5" strokeWidth={1.4} />
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <h1 className="font-display text-[24px] leading-none font-light italic tracking-tight">
              moonbase
            </h1>
            <span className="text-muted-foreground/80 font-mono text-[10px] tracking-[0.2em] uppercase">
              personal command center
            </span>
          </div>
        </div>
        <LoginForm next={sp.next} initialError={sp.error} />
      </div>
    </main>
  );
}

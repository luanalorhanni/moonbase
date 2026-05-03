"use client";

import { LogIn, Moon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/auth/client";

type Props = {
  next?: string;
  initialError?: string;
};

export function LoginForm({ next, initialError }: Props) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [isPending, startTransition] = useTransition();
  const [isOAuthPending, startOAuthTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (signInError) {
        setError(translateError(signInError.message));
        return;
      }
      const dest = next && next.startsWith("/") ? next : "/";
      router.replace(dest);
      router.refresh();
    });
  }

  function handleGoogle() {
    setError(null);
    startOAuthTransition(async () => {
      const supabase = createClient();
      const safeNext = next && next.startsWith("/") ? next : "/";
      const redirectTo = `${window.location.origin}/api/auth-callback?next=${encodeURIComponent(safeNext)}`;
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });
      if (oauthError) setError(oauthError.message);
      // On success Supabase redirects the browser away — nothing else to do.
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <button
        type="button"
        onClick={handleGoogle}
        disabled={isOAuthPending || isPending}
        className="border-border hover:bg-muted/40 flex h-10 items-center justify-center gap-2.5 rounded-md border bg-card text-[13px] font-medium transition-colors disabled:opacity-50"
      >
        <GoogleGlyph className="size-4 shrink-0" />
        {isOAuthPending ? "abrindo google…" : "continuar com google"}
      </button>

      <div className="text-muted-foreground/60 flex items-center gap-3 font-mono text-[10px] tracking-[0.18em] uppercase">
        <span className="bg-border h-px flex-1" />
        ou com email
        <span className="bg-border h-px flex-1" />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        <FieldGroup className="gap-4">
          <Field>
            <FieldLabel htmlFor="login-email">email</FieldLabel>
            <Input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isPending || isOAuthPending}
              required
              autoComplete="email"
              className="h-10"
            />
          </Field>
          <Field>
            <div className="flex items-baseline justify-between gap-3">
              <FieldLabel htmlFor="login-password">senha</FieldLabel>
              <Link
                href="/forgot-password"
                className="text-muted-foreground/70 hover:text-foreground text-[11px] transition-colors"
              >
                esqueceu?
              </Link>
            </div>
            <Input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isPending || isOAuthPending}
              required
              autoComplete="current-password"
              className="h-10"
            />
          </Field>
          {error && <FieldError>{error}</FieldError>}
        </FieldGroup>
        <Button
          type="submit"
          disabled={isPending || isOAuthPending || !email.trim() || !password}
          className="h-10"
        >
          {isPending ? (
            <>
              <Moon aria-hidden className="size-3.5 animate-pulse" strokeWidth={1.6} />
              entrando…
            </>
          ) : (
            <>
              <LogIn aria-hidden className="size-3.5" strokeWidth={1.7} />
              entrar
            </>
          )}
        </Button>
      </form>
    </div>
  );
}

function translateError(msg: string): string {
  const lower = msg.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "email ou senha incorretos.";
  }
  if (lower.includes("email not confirmed")) {
    return "email ainda não confirmado. cheque sua caixa de entrada.";
  }
  if (lower.includes("too many")) {
    return "muitas tentativas. tente novamente em alguns minutos.";
  }
  return msg;
}

/** Inline Google "G" mark, no external dependency. */
function GoogleGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.84h5.36c-.24 1.39-.97 2.57-2.07 3.36l3.34 2.59c1.95-1.8 3.07-4.46 3.07-7.62 0-.74-.07-1.45-.19-2.13H12z"
      />
      <path
        fill="#4285F4"
        d="M5.28 14.27 4.53 14.84l-2.66 2.07A10 10 0 0 0 12 22c2.7 0 4.96-.89 6.61-2.41l-3.34-2.59c-.92.62-2.1.99-3.27.99-2.51 0-4.65-1.7-5.41-3.98l-1.31.26z"
      />
      <path
        fill="#FBBC05"
        d="M1.87 7.09A9.97 9.97 0 0 0 2 12c0 1.61.39 3.13 1.07 4.47l3.42-2.66a5.96 5.96 0 0 1-.32-1.81c0-.63.11-1.24.31-1.81L1.87 7.09z"
      />
      <path
        fill="#34A853"
        d="M12 6.04c1.47 0 2.79.51 3.83 1.5l2.86-2.86C16.95 2.99 14.7 2 12 2A10 10 0 0 0 1.87 7.09l3.42 2.66C5.86 7.74 7.99 6.04 12 6.04z"
      />
    </svg>
  );
}

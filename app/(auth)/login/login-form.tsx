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
      // Hard navigation so the middleware re-runs and the new session
      // cookie is picked up by the dashboard's RSCs.
      const dest = next && next.startsWith("/") ? next : "/";
      router.replace(dest);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="login-email">email</FieldLabel>
          <Input
            id="login-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={isPending}
            required
            autoComplete="email"
            autoFocus
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
            disabled={isPending}
            required
            autoComplete="current-password"
            className="h-10"
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>
      <Button
        type="submit"
        disabled={isPending || !email.trim() || !password}
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

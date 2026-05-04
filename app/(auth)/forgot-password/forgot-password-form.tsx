"use client";

import { Mail, Send } from "lucide-react";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/auth/client";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const origin = window.location.origin;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/api/auth-callback?next=/reset-password`,
      });
      if (resetError) {
        setError(resetError.message);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="border-success/30 bg-success/10 text-success flex items-start gap-3 rounded-md border px-4 py-3 text-[12.5px]">
        <Mail aria-hidden className="mt-0.5 size-4 shrink-0" strokeWidth={1.6} />
        <div className="flex flex-col gap-1">
          <span className="font-medium">link sent.</span>
          <span className="text-success/85 leading-relaxed">
            check your email — it can take a few minutes. the link expires in 1 hour.
          </span>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="forgot-email">email</FieldLabel>
          <Input
            id="forgot-email"
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
        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>
      <Button type="submit" disabled={isPending || !email.trim()} className="h-10">
        <Send aria-hidden className="size-3.5" strokeWidth={1.7} />
        {isPending ? "sending…" : "send link"}
      </Button>
    </form>
  );
}

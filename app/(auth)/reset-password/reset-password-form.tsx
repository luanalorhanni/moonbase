"use client";

import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/auth/client";

const MIN_LEN = 8;

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password.length < MIN_LEN) {
      setError(`a senha precisa ter pelo menos ${MIN_LEN} caracteres.`);
      return;
    }
    if (password !== confirm) {
      setError("as duas senhas não conferem.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: updateError } = await supabase.auth.updateUser({ password });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      router.replace("/");
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      <FieldGroup className="gap-4">
        <Field>
          <FieldLabel htmlFor="reset-password">nova senha</FieldLabel>
          <Input
            id="reset-password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={isPending}
            required
            autoComplete="new-password"
            autoFocus
            className="h-10"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="reset-confirm">confirmar senha</FieldLabel>
          <Input
            id="reset-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={isPending}
            required
            autoComplete="new-password"
            className="h-10"
          />
        </Field>
        {error && <FieldError>{error}</FieldError>}
      </FieldGroup>
      <Button type="submit" disabled={isPending} className="h-10">
        <Save aria-hidden className="size-3.5" strokeWidth={1.7} />
        {isPending ? "salvando…" : "salvar senha"}
      </Button>
    </form>
  );
}

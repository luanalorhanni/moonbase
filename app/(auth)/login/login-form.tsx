"use client";

import { Moon } from "lucide-react";
import { useActionState } from "react";

import { sendMagicLink, type SendMagicLinkResult } from "@/lib/actions/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

async function action(_prev: SendMagicLinkResult | null, formData: FormData) {
  return sendMagicLink(formData);
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(action, null);

  if (state && "ok" in state) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="items-center gap-3 text-center">
          <Moon className="text-muted-foreground size-10" strokeWidth={1.25} aria-hidden />
          <h1 className="text-2xl font-semibold tracking-tight">Verifique seu email</h1>
          <p className="text-muted-foreground text-sm">
            Enviamos um link de acesso. Abra a mensagem para entrar.
          </p>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="items-center gap-3 text-center">
        <Moon className="text-muted-foreground size-10" strokeWidth={1.25} aria-hidden />
        <h1 className="text-2xl font-semibold tracking-tight">moonbase</h1>
        <p className="text-muted-foreground text-sm">
          Entre com seu email para receber um link de acesso.
        </p>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              disabled={isPending}
            />
          </div>
          {state && "error" in state ? (
            <p className="text-destructive text-sm" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button type="submit" disabled={isPending} className="w-full">
            {isPending ? "Enviando..." : "Enviar link de acesso"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

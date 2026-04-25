"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/auth/server";

export type SendMagicLinkResult = { error: string } | { ok: true };

/**
 * Sends a magic-link email via Supabase Auth. The email contains a link
 * that lands on /callback?code=..., which the route handler exchanges for
 * a session.
 *
 * The redirect target is computed from request headers so it works both
 * locally (http://localhost:3000) and on Vercel (https://<domain>) without
 * an extra environment variable.
 */
export async function sendMagicLink(formData: FormData): Promise<SendMagicLinkResult> {
  const email = formData.get("email");
  if (typeof email !== "string" || email.length === 0) {
    return { error: "Informe um email." };
  }

  const supabase = await createClient();
  const headerList = await headers();
  const host = headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";
  const origin = headerList.get("origin") ?? (host ? `${protocol}://${host}` : "");

  if (!origin) {
    return { error: "Não foi possível determinar o domínio. Tente novamente." };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${origin}/callback`,
      shouldCreateUser: true,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}

/**
 * Signs out and redirects to the login page.
 */
export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

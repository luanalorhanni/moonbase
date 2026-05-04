import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/auth/server";

/**
 * Handles the redirect from Supabase after the user clicks a magic
 * link or password-recovery email. Exchanges the one-time code for a
 * session cookie, then sends the user on to `next` (typically
 * /reset-password for the recovery flow, or / for sign-in).
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing_code", url));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=${encodeURIComponent(error.message)}`, url));
  }

  const dest = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(dest, url));
}

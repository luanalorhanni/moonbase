import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/auth/server";

/**
 * Handles the magic-link redirect from Supabase. Exchanges the one-time
 * code for a session (which gets persisted as cookies by the SSR client),
 * then sends the user to wherever they were originally heading.
 *
 * The `next` parameter is constrained to relative paths to prevent
 * open-redirect abuse — a malicious sender could craft a magic-link URL
 * with `next=https://evil.com` otherwise.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requestedNext = searchParams.get("next");
  const next = requestedNext && requestedNext.startsWith("/") ? requestedNext : "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}

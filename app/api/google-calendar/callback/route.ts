import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { TAGS, invalidate } from "@/lib/cache/tags";
import { exchangeCodeForTokens, saveTokens } from "@/lib/google-calendar";

/**
 * OAuth callback. Validates state cookie, exchanges the auth code for
 * tokens, persists them, and redirects the user back to /calendar.
 */
export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  // User denied consent or Google returned an error.
  if (error) {
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(error)}`, request.url),
    );
  }
  if (!code || !state) {
    return NextResponse.redirect(new URL("/calendar?error=missing_code", request.url));
  }

  // Validate the state cookie matches what we set on /start.
  const cookieHeader = request.headers.get("cookie") ?? "";
  const stateCookie = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith("gcal_oauth_state="))
    ?.split("=")[1];

  if (!stateCookie || stateCookie !== state) {
    return NextResponse.redirect(
      new URL("/calendar?error=invalid_state", request.url),
    );
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    await saveTokens(user.id, tokens);
    invalidate(TAGS.googleCalendarTokens);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "exchange_failed";
    return NextResponse.redirect(
      new URL(`/calendar?error=${encodeURIComponent(msg)}`, request.url),
    );
  }

  // Clear the state cookie and bounce back to the calendar page.
  const res = NextResponse.redirect(new URL("/calendar?connected=1", request.url));
  res.cookies.set("gcal_oauth_state", "", { path: "/", maxAge: 0 });
  return res;
}

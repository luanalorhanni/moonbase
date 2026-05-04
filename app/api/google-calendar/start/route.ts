import { NextResponse } from "next/server";

import { requireUser } from "@/lib/auth/session";
import { buildAuthorizeUrl, isGoogleCalendarConfigured } from "@/lib/google-calendar";

/**
 * Kick off the Google OAuth flow. Generates a short-lived state
 * cookie that the callback verifies to defend against CSRF, then
 * redirects to Google's consent screen.
 */
export async function GET() {
  await requireUser();

  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      {
        error:
          "GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET not configured in .env.local",
      },
      { status: 503 },
    );
  }

  // Random state token — verified by the callback to ensure we
  // initiated this flow ourselves.
  const state = crypto.randomUUID();
  const url = buildAuthorizeUrl(state);

  const res = NextResponse.redirect(url);
  res.cookies.set("gcal_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600, // 10 minutes
  });
  return res;
}

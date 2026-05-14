import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Auth middleware: refreshes the Supabase session cookie on every
 * request and gates protected routes. Anything not under /login,
 * /forgot-password, /reset-password, or /api/auth-callback requires a
 * logged-in session — unauthed visitors are bounced to /login.
 *
 * Returning `supabaseResponse` (not a fresh NextResponse) is crucial:
 * Supabase mutates response cookies during `getUser()` and we have to
 * forward those exact cookies back, otherwise the session silently
 * stops refreshing.
 */
const PUBLIC_PATHS = ["/login", "/forgot-password", "/reset-password"];

export async function proxy(request: NextRequest) {
  // Recovery / magic-link safety net: if Supabase redirected the user
  // back to ANY path (e.g. just "/" because the exact callback URL
  // wasn't whitelisted) but the URL still carries the one-time `code`,
  // funnel it through our auth-callback handler so the session
  // exchange actually happens. We preserve the original path as `next`
  // so they land where Supabase intended after the exchange.
  const codeParam = request.nextUrl.searchParams.get("code");
  if (codeParam && request.nextUrl.pathname !== "/api/auth-callback") {
    const url = request.nextUrl.clone();
    const originalPath = url.pathname;
    const type = url.searchParams.get("type");
    url.pathname = "/api/auth-callback";
    url.searchParams.set("code", codeParam);
    // Recovery flows always end on the reset-password screen, no
    // matter where Supabase decided to land the user.
    if (type === "recovery") {
      url.searchParams.set("next", "/reset-password");
    } else if (originalPath !== "/" && !url.searchParams.has("next")) {
      url.searchParams.set("next", originalPath);
    }
    return NextResponse.redirect(url);
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          supabaseResponse = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // IMPORTANT: don't add code between createServerClient and getUser.
  // Supabase docs warn this can cause silent session-loss bugs.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;
  const isPublic =
    PUBLIC_PATHS.some((p) => path === p || path.startsWith(`${p}/`)) ||
    path.startsWith("/api/auth-callback");

  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    // Preserve where they were headed so we can bounce back after login.
    url.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(url);
  }

  // Already logged in but visiting /login — send them home.
  if (user && path === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    // Skip Next.js internals + static assets so the auth check doesn't
    // run on every CSS / image / font request.
    "/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};

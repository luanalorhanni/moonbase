import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/auth/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  /*
   * Run on every path except:
   * - _next/static (static files)
   * - _next/image (image optimization)
   * - favicon.ico, manifest.json, icons/* (PWA assets)
   * - common image extensions
   *
   * Auth-public paths (/login, /callback) still run through the proxy so the
   * session can be refreshed; the helper itself decides whether to redirect.
   */
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons/.*|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

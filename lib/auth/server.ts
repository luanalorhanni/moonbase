import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * Server-side Supabase client for RSC, route handlers, and server
 * actions. Reads the auth cookies set by the middleware so
 * `supabase.auth.getUser()` returns the live session.
 *
 * In Server Components, calling `cookies().set()` throws — we swallow
 * the error there. The middleware is the single place where session
 * cookies actually get refreshed and written back to the response.
 */
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — middleware refreshes
            // the cookies, so it's safe to ignore here.
          }
        },
      },
    },
  );
}

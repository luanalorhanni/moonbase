"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client. Used by Client Components — the login
 * form, the logout trigger, anything that needs to call
 * `supabase.auth.*` from the browser.
 *
 * The anon key is safe to ship to the browser; row-level security on
 * Supabase enforces what the user can read/write.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

import "server-only";

import { redirect } from "next/navigation";
import { cache } from "react";

import { createClient } from "@/lib/auth/server";

/**
 * Authenticated user identity for the current request. Reads from the
 * Supabase session cookie (refreshed by `middleware.ts`). The single
 * source of truth for `user_id` in queries and inserts.
 *
 * `name` and `avatarUrl` come from the OAuth provider's user_metadata
 * (Google populates `full_name` + `avatar_url` on first sign-in). They
 * may be null when the user signed in with email + password and never
 * linked a Google identity.
 */
export type CurrentUser = {
  id: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
};

/**
 * Wrapped in React `cache()` so a single render dedupes all calls to
 * `supabase.auth.getUser()` (a network round trip). Without this, each
 * cached query — and there can be a dozen on a heavy page — re-validates
 * the JWT against Supabase Auth, adding hundreds of ms of latency for
 * nothing.
 */
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  const meta = data.user.user_metadata as Record<string, unknown> | null | undefined;
  const name =
    (typeof meta?.full_name === "string" && meta.full_name) ||
    (typeof meta?.name === "string" && meta.name) ||
    null;
  const avatarUrl =
    (typeof meta?.avatar_url === "string" && meta.avatar_url) ||
    (typeof meta?.picture === "string" && meta.picture) ||
    null;
  return {
    id: data.user.id,
    email: data.user.email ?? null,
    name,
    avatarUrl,
  };
});

/**
 * Use in server actions / RSCs that strictly require an authenticated
 * user. Mirrors the middleware's redirect — if the cookie was somehow
 * cleared between the middleware and the action, we still bounce out
 * cleanly instead of crashing on a null user.
 */
export const requireUser = cache(async (): Promise<CurrentUser> => {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
});

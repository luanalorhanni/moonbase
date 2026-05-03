import "server-only";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/auth/server";

/**
 * Authenticated user identity for the current request. Reads from the
 * Supabase session cookie (refreshed by `middleware.ts`). The single
 * source of truth for `user_id` in queries and inserts.
 */
export type CurrentUser = {
  id: string;
  email: string | null;
};

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return null;
  return { id: data.user.id, email: data.user.email ?? null };
}

/**
 * Use in server actions / RSCs that strictly require an authenticated
 * user. Mirrors the middleware's redirect — if the cookie was somehow
 * cleared between the middleware and the action, we still bounce out
 * cleanly instead of crashing on a null user.
 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

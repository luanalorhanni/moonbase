import { redirect } from "next/navigation";

import { createClient } from "./server";

/**
 * Returns the currently authenticated user from cookies, or null when no
 * session is present. Use this in Server Components / Server Actions /
 * Route Handlers to read auth state.
 */
export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/**
 * Returns the currently authenticated user, or redirects to /login if the
 * caller is anonymous. Defense-in-depth alongside the middleware: the
 * middleware redirects pre-render, but layouts that use this helper get a
 * type-narrowed user without an extra null check.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

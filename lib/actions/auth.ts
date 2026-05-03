"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/auth/server";

/**
 * Sign the user out and bounce to the login page. Called from the
 * sidebar footer's logout button.
 */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

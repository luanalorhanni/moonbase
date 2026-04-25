/**
 * Single-user app: there is no real auth. `requireUser()` and
 * `getCurrentUser()` return a fixed user whose id comes from the
 * MOONBASE_USER_ID env var. Set it in .env.local to the UUID of your row in
 * Supabase's auth.users table so existing data stays visible. The same UUID
 * is used as user_id for every insert.
 */

const userId = process.env.MOONBASE_USER_ID;

if (!userId) {
  throw new Error(
    "MOONBASE_USER_ID is not set. Add it to .env.local — it must match the user_id used by your existing rows.",
  );
}

const fixedUser = { id: userId } as const;

export async function getCurrentUser() {
  return fixedUser;
}

export async function requireUser() {
  return fixedUser;
}

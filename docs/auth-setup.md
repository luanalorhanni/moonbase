# Auth setup

> Phase 2 of the architecture roadmap. The app uses **Supabase Auth** with two sign-in paths:
> - **Continue with Google** (preferred — one click, no password to remember).
> - **Email + password** (fallback). Recovery via Supabase's password-reset email.

## What lives where

| Concern                              | File                                      |
| ------------------------------------ | ----------------------------------------- |
| Server client (RSC, Server Actions)  | `lib/auth/server.ts`                      |
| Browser client                       | `lib/auth/client.ts`                      |
| Session helpers                      | `lib/auth/session.ts` (`getCurrentUser`, `requireUser`) |
| Middleware (refresh + protect)       | `middleware.ts` at repo root              |
| Login form                           | `app/(auth)/login/page.tsx` + `login-form.tsx` |
| Forgot password                      | `app/(auth)/forgot-password/`             |
| Reset password                       | `app/(auth)/reset-password/`              |
| Auth callback (recovery exchange)    | `app/api/auth-callback/route.ts`          |
| Auth Server Actions                  | `lib/actions/auth.ts` (`signOut`)         |
| Sidebar user / logout button         | `components/dashboard/sidebar-user.tsx`   |

The middleware runs on every non-static path. Public auth routes (`/login`, `/forgot-password`, `/reset-password`, `/api/auth-callback`) still pass through it so the session cookie can be refreshed; the helper just chooses not to redirect them.

## Required environment variables

In `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<from Supabase → Project Settings → API>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<same page>
```

Both are public-facing — RLS on Supabase enforces what the user can read/write.

## First-time password setup

The app does **not** expose a public signup page. To set the initial password for your existing user:

1. Open Supabase dashboard → **Authentication → Users**.
2. Find your user (the one whose UUID matches all your existing data).
3. Click the row → "Send password recovery" — Supabase emails a recovery link.
4. Click the link in your inbox; it lands you at `/reset-password` where you set the password.

Alternatively, you can set the password directly in the dashboard via the user's "..." menu → "Send magic link" → use the magic link to log in once → visit `/forgot-password` → click the email link → set password.

## Required Supabase dashboard configuration

### 1. Authentication → Providers → Email

Confirm the **Email provider** is **enabled**. It is by default.

For a single-user system, you should:
- Disable **"Enable signups"** so nobody else can create an account at your URL.
- Leave **"Confirm email"** on so unverified emails cannot sign in (relevant if you ever change your address).

### 2. Authentication → Providers → Google

Enable Google sign-in:

1. **Create a Google OAuth client** at https://console.cloud.google.com/apis/credentials (or reuse an existing one if you already have a project set up).
2. In the Google Cloud Console, edit the OAuth 2.0 Client and add this URL to **Authorized redirect URIs**:
   ```
   https://<your-supabase-ref>.supabase.co/auth/v1/callback
   ```
   (Supabase shows the exact URL inside its Google provider config page — copy that.)
3. Back in Supabase: toggle **Google** on, paste the Client ID + Client Secret, save.

Because the Supabase email user (`luanalorhannips@gmail.com`) and the Google account share the same address, Supabase automatically links the Google identity to the existing user row on first sign-in — your existing `user_id` stays the same and all your data remains visible.

### 3. Authentication → URL Configuration

Add the following to **Redirect URLs**:

```
http://localhost:3000/api/auth-callback
http://localhost:3000/**
https://<your-vercel-domain>/api/auth-callback
https://<your-vercel-domain>/**
```

The `Site URL` should be your production domain once Vercel is connected (`https://<your-vercel-domain>`); for now `http://localhost:3000` is fine. The wildcard variants act as a safety net — the middleware also funnels stray `?code=` params through the callback regardless of path, but having them whitelisted is cleaner.

### 4. (Optional) Authentication → Email Templates → Recovery

The default template works. Customise the Portuguese-Brazilian copy if you like — the link variable is `{{ .ConfirmationURL }}`.

## Local sign-in flow

1. `pnpm dev` and open http://localhost:3000.
2. Middleware sees no session, redirects to `/login`.
3. **With Google**: click **continuar com google** → Google consent screen → redirected back through `/api/auth-callback` → land on `/`.
4. **With email + password**: type credentials, hit **entrar**. `supabase.auth.signInWithPassword` sets the session cookie.
5. The dashboard layout calls `requireUser()`, sees the session, renders the page with your email and a logout button in the sidebar footer.
6. Clicking the logout icon runs the `signOut` Server Action, which clears cookies and redirects to `/login`.

## Things to watch in production

- The **Redirect URLs** list in Supabase **must** include the live `/api/auth-callback` for password recovery to work. A link to a domain that isn't whitelisted fails with `Invalid redirect URL`.
- If you change domains, add the new one to the redirect list **before** flipping DNS.
- Keep `Enable signups` disabled. With it enabled, anyone who finds your URL could create an account (RLS still isolates their data, but it's noise).

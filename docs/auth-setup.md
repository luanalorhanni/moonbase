# Auth setup

> Phase 2 of the architecture roadmap. The app uses Supabase Auth with magic-link sign-in. Email + password is intentionally **not** offered — for a single-user application, the password adds attack surface (and a thing to forget) without buying anything.

## What lives where

| Concern              | File                                  |
| -------------------- | ------------------------------------- |
| Server client (RSC, Server Actions) | `lib/auth/server.ts`     |
| Browser client       | `lib/auth/client.ts`                  |
| Session helpers      | `lib/auth/session.ts` (`getCurrentUser`, `requireUser`) |
| Middleware           | `lib/auth/middleware.ts` + root `middleware.ts` |
| Login form           | `app/(auth)/login/page.tsx` + `login-form.tsx` |
| Magic-link callback  | `app/(auth)/callback/route.ts`        |
| Auth Server Actions  | `lib/actions/auth.ts` (`sendMagicLink`, `signOut`) |
| Protected layout     | `app/(dashboard)/layout.tsx` (calls `requireUser`) |

The middleware runs on every non-static path. Public auth routes (`/login`, `/callback`) still pass through it so the session can be refreshed; the helper just chooses not to redirect them.

## Required Supabase dashboard configuration

Open your project at https://supabase.com/dashboard.

### 1. Authentication → Providers → Email

Confirm **Email provider** is **enabled**. It is by default on a fresh Supabase project. Magic links work without any extra config.

If you want only your own email to be able to sign in (recommended for a single-user system):

- Toggle on **"Confirm email"** so unverified emails cannot sign in.
- Either disable **"Enable signups"** entirely (then create your own user via the dashboard's "Add user" → "Send invitation"), or leave signups enabled and trust that nobody knows the URL.

### 2. Authentication → URL Configuration

Add the following redirect URLs:

```
http://localhost:3000/callback
https://<your-vercel-domain>/callback
```

The `Site URL` should be your production domain once Vercel is connected (`https://<your-vercel-domain>`); for now `http://localhost:3000` is fine.

### 3. (Optional) Authentication → Email Templates → Magic Link

The default template works. If you want, customise the subject and Portuguese-Brazilian copy. The template variable for the link is `{{ .ConfirmationURL }}`.

## Local sign-in flow

1. `pnpm dev` and open http://localhost:3000.
2. Middleware sees no session, redirects to `/login`.
3. Type your email, hit **Enviar link de acesso**. The Server Action calls `supabase.auth.signInWithOtp` with `emailRedirectTo` derived from request headers.
4. Supabase sends the email. On the free tier rate-limit is 4 emails/hour by default; raise it under **Authentication → Rate Limits** if needed during testing.
5. Click the link. It opens `http://localhost:3000/callback?code=...`, the route handler exchanges the code for a session cookie, then redirects you to `/`.
6. The dashboard layout calls `requireUser()`, sees the session, renders the page with your email and a **Sair** button in the header.
7. Clicking **Sair** runs the `signOut` Server Action, which clears cookies and redirects to `/login`.

## Things to watch in production

- The redirect URL list in Supabase **must** include the live domain. Magic links to a domain that isn't whitelisted produce an `Invalid redirect URL` error.
- If you change domains, add the new one to the redirect list **before** flipping DNS.
- The free-tier email rate limit (4/hour by default) is shared across all email types (magic link + invites + recovery). You can ship your own SMTP via **Authentication → SMTP Settings** if it ever becomes a constraint.

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle client for runtime queries (server components, server actions,
 * route handlers). Reads DATABASE_URL from the environment — locally this
 * comes from .env.local, on Vercel from project environment variables.
 *
 * Uses `postgres-js` (porsager/postgres) per Drizzle's recommendation for
 * Supabase.
 *
 * Why `max: 10` instead of 1: with the Supabase transaction pooler each
 * connection is checked out from pgbouncer per query, so we can safely
 * have several in flight. The previous `max: 1` serialised everything
 * inside `Promise.all([...])` — a page with 6 parallel reads paid 6
 * sequential round-trips. `prepare: false` is still required because
 * pgbouncer can't track prepared statements across connections.
 *
 * In dev, the module is re-evaluated on HMR; the `globalThis` cache
 * keeps a single client across reloads so we don't leak sockets.
 *
 * Migrations are run separately via `pnpm db:migrate` (drizzle-kit), which
 * picks up its own connection from drizzle.config.ts.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.local.example to .env.local and fill in the connection string.",
  );
}

type DbGlobal = typeof globalThis & {
  __moonbasePgClient?: ReturnType<typeof postgres>;
};
const g = globalThis as DbGlobal;

const client =
  g.__moonbasePgClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
  });

if (process.env.NODE_ENV !== "production") {
  g.__moonbasePgClient = client;
}

export const db = drizzle(client, { schema });
export { schema };

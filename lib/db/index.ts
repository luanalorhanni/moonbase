import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
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
 * Why the lazy proxy: at build time on Vercel, Next.js collects page
 * data by evaluating route modules. Some of those imports `db` even
 * though no query actually runs. Throwing on missing DATABASE_URL at
 * import time blew up `next build` whenever the env wasn't injected.
 * The proxy defers the connection string check (and the postgres()
 * call) until the first real read or write — so module evaluation is
 * always cheap and side-effect-free.
 *
 * In dev, the module is re-evaluated on HMR; the `globalThis` cache
 * keeps a single client across reloads so we don't leak sockets.
 *
 * Migrations are run separately via `pnpm db:migrate` (drizzle-kit), which
 * picks up its own connection from drizzle.config.ts.
 */

type DbGlobal = typeof globalThis & {
  __moonbasePgClient?: ReturnType<typeof postgres>;
  __moonbaseDrizzle?: PostgresJsDatabase<typeof schema>;
};

function buildClient(): ReturnType<typeof postgres> {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.local.example to .env.local and fill in the connection string.",
    );
  }
  return postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    prepare: false,
    // Keep `date` columns as raw `yyyy-mm-dd` strings instead of letting
    // the driver hydrate them into JS `Date`s. Critical: `Date(yyyy-mm-01
    // UTC)` formatted via `toString()` in BRT (UTC-3) reads as the
    // previous day, which silently broke snapshot/month-key lookups
    // around the year boundary.
    types: {
      // OID 1082 = postgres `date` type. Leaving `timestamp`/`timestamptz`
      // (1114/1184) untouched so `createdAt` columns still parse to Date.
      date: {
        to: 1082,
        from: [1082],
        serialize: (x: string) => x,
        parse: (x: string) => x,
      },
    },
  });
}

function getDrizzle(): PostgresJsDatabase<typeof schema> {
  const g = globalThis as DbGlobal;
  if (g.__moonbaseDrizzle) return g.__moonbaseDrizzle;
  const client = g.__moonbasePgClient ?? buildClient();
  const instance = drizzle(client, { schema });
  if (process.env.NODE_ENV !== "production") {
    g.__moonbasePgClient = client;
    g.__moonbaseDrizzle = instance;
  }
  return instance;
}

/**
 * Proxy that forwards every property access to a real Drizzle client
 * built on first use. The proxy itself is created at module-load time,
 * but `getDrizzle()` only runs when something actually reads off it —
 * so an unused import never trips the env-var check.
 */
export const db = new Proxy({} as PostgresJsDatabase<typeof schema>, {
  get(_target, prop, receiver) {
    const real = getDrizzle();
    const value = Reflect.get(real, prop, receiver);
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };

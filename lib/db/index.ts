import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import * as schema from "./schema";

/**
 * Drizzle client for runtime queries (server components, server actions,
 * route handlers). Reads DATABASE_URL from the environment — locally this
 * comes from .env.local, on Vercel from project environment variables.
 *
 * Uses `postgres-js` (porsager/postgres) per Drizzle's recommendation for
 * Supabase. `max: 1` keeps a single connection per serverless invocation,
 * which is what the Supabase transaction pooler expects.
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

const client = postgres(connectionString, { max: 1, prepare: false });

export const db = drizzle(client, { schema });
export { schema };

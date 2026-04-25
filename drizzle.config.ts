import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

// Load .env.local explicitly — Next.js loads it for the app at runtime,
// but drizzle-kit runs as a standalone CLI and does not.
config({ path: ".env.local" });

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to run drizzle-kit (see .env.local.example).");
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Use a direct connection (port 5432) for migrations — the Supabase
  // transaction pooler (port 6543) does not support the DDL transactions
  // drizzle-kit emits.
  strict: true,
  verbose: true,
});

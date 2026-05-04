// One-shot helper to apply lib/db/migrations/0010_journal.sql against Supabase.
// Splits statements by ";\n" and runs each via postgres-js. Idempotent (the
// migration uses IF NOT EXISTS / DROP POLICY IF EXISTS guards where it can).

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL missing from .env.local");
  process.exit(1);
}

const sqlText = readFileSync("lib/db/migrations/0010_journal.sql", "utf8");

// Strip SQL line comments, then split on ";" terminators that are at end of
// a line (so semicolons inside quoted strings stay intact — none in this file).
const statements = sqlText
  .split("\n")
  .filter((line) => !line.trim().startsWith("--"))
  .join("\n")
  .split(/;\s*\n/)
  .map((s) => s.trim())
  .filter((s) => s.length > 0);

const sql = postgres(url, { prepare: false, max: 1 });

let okCount = 0;
let skipped = 0;

for (const stmt of statements) {
  const head = stmt.slice(0, 70).replace(/\s+/g, " ");
  try {
    await sql.unsafe(stmt);
    okCount++;
    console.log(`✓ ${head}`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // CREATE POLICY doesn't support IF NOT EXISTS in PG < 16. Treat
    // "already exists" as success — the policy is in place either way.
    if (/already exists/i.test(msg)) {
      skipped++;
      console.log(`· already exists: ${head}`);
    } else {
      console.error(`✗ ${head}`);
      console.error(`   ${msg}`);
      await sql.end();
      process.exit(1);
    }
  }
}

console.log(`\nDone — ${okCount} applied, ${skipped} already in place.`);
await sql.end();

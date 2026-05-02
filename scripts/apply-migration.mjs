/**
 * Tiny one-shot migration runner. Usage:
 *   pnpm tsx --env-file=.env.local scripts/apply-migration.mjs <path/to/migration.sql>
 *
 * Splits the file on `;\n` boundaries and runs each statement against the
 * configured DATABASE_URL. Wraps the whole batch in a single transaction.
 */
import { readFile } from "node:fs/promises";

import postgres from "postgres";

const file = process.argv[2];
if (!file) {
  process.stderr.write("usage: apply-migration.mjs <path/to/migration.sql>\n");
  process.exit(1);
}

const sql = await readFile(file, "utf8");
const client = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  await client.begin(async (tx) => {
    await tx.unsafe(sql);
  });
  process.stdout.write(`✓ applied ${file}\n`);
} catch (err) {
  process.stderr.write(`✗ migration failed: ${err.message}\n`);
  process.exit(1);
} finally {
  await client.end();
}

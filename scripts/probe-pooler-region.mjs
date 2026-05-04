 
// One-shot script: discover which Supabase pooler region accepts our credentials.
// Reads SUPABASE_PROJECT_REF and SUPABASE_DB_PASSWORD from process.env.
// Prints the working pooler URL on stdout and exits 0; exits 1 if none worked.

import postgres from "postgres";

const REGIONS = [
  "sa-east-1",
  "us-east-1",
  "us-east-2",
  "us-west-1",
  "us-west-2",
  "eu-west-1",
  "eu-west-2",
  "eu-central-1",
  "ap-southeast-1",
  "ap-southeast-2",
  "ap-northeast-1",
];

const HOST_TEMPLATES = [
  (r) => `aws-0-${r}.pooler.supabase.com`,
  (r) => `aws-1-${r}.pooler.supabase.com`,
];

const ref = process.env.SUPABASE_PROJECT_REF;
const password = process.env.SUPABASE_DB_PASSWORD;
if (!ref || !password) {
  console.error("Missing SUPABASE_PROJECT_REF or SUPABASE_DB_PASSWORD");
  process.exit(2);
}

for (const region of REGIONS) {
  for (const template of HOST_TEMPLATES) {
    const host = template(region);
    const url = `postgresql://postgres.${ref}:${encodeURIComponent(password)}@${host}:6543/postgres`;
    const sql = postgres(url, {
      max: 1,
      prepare: false,
      connect_timeout: 5,
      idle_timeout: 1,
    });
    try {
      const rows = await sql`select 1 as ok`;
      if (rows[0]?.ok === 1) {
        console.log(JSON.stringify({ region, host, url }));
        await sql.end({ timeout: 1 });
        process.exit(0);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`✗ ${host}: ${message}\n`);
    } finally {
      try {
        await sql.end({ timeout: 1 });
      } catch {
        // ignore
      }
    }
  }
}

console.error("No pooler region accepted the credentials.");
process.exit(1);

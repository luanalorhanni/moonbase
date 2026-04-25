import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const userId = process.env.MOONBASE_USER_ID;

const tables = [
  "cards", "categories", "subcategories", "incomes",
  "cash_expenses", "credit_expenses", "fixed_expenses",
  "cash_receivables", "credit_receivables",
  "liquid_savings", "fixed_income",
  "card_closings", "monthly_snapshots",
];

for (const t of tables) {
  const rows = await sql.unsafe(`SELECT count(*)::int AS n FROM ${t} WHERE user_id = $1`, [userId]);
  console.log(`${t.padEnd(22)} ${rows[0].n}`);
}

await sql.end();

// Seed monthly_snapshots with historical months (before active tracking).
// Reads logs_past_years.csv and computes the running cumulative
// totalSave so the year/cumulative views reflect the full history.

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const CSV = "C:\\Users\\luana\\Downloads\\logs_past_years.csv";
const USER = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

const PT_MONTHS = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

function parseBRL(s) {
  return Number(
    s
      .replace(/[Rr]\$\s*/g, "")
      .replace(/ /g, "")
      .trim()
      .replace(/\./g, "")
      .replace(",", "."),
  );
}

function parsePtMonth(s) {
  const m = s
    .trim()
    .toLowerCase()
    .match(/^([a-zçãéíóôú]+)\s+(\d{4})$/);
  if (!m) throw new Error(`bad month label: ${s}`);
  const norm = m[1].normalize("NFKD").replace(/[̀-ͯ]/g, "");
  const mm = PT_MONTHS[norm];
  if (!mm) throw new Error(`unknown month: ${m[1]}`);
  return `${m[2]}-${mm}-01`;
}

function parseCsv(text) {
  const out = [];
  let row = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\r") {
      } else if (c === "\n") {
        row.push(cell);
        out.push(row);
        row = [];
        cell = "";
      } else cell += c;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

const rows = parseCsv(readFileSync(CSV, "utf8")).filter((r) => r.length > 1);
const [, ...body] = rows;

let cumulative = 0;
const records = body
  .filter((r) => r[0]?.trim())
  .map((r) => {
    const incomes = parseBRL(r[1]);
    const expenses = parseBRL(r[2]);
    const save = incomes - expenses;
    cumulative += save;
    return {
      monthLabel: r[0].trim().toLowerCase(),
      referenceMonth: parsePtMonth(r[0]),
      totalIncomes: incomes.toFixed(2),
      totalExpenses: expenses.toFixed(2),
      totalSave: cumulative.toFixed(2),
    };
  });

console.log(
  `parsed ${records.length} historical months, ending cumulative R$ ${cumulative.toFixed(2)}`,
);

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

let inserted = 0;
let updated = 0;
for (const r of records) {
  const result = await sql`
    INSERT INTO monthly_snapshots (
      user_id, month_label, reference_month,
      total_incomes, total_expenses, total_save,
      total_liquid_savings, total_fixed_income, status
    ) VALUES (
      ${USER}, ${r.monthLabel}, ${r.referenceMonth},
      ${r.totalIncomes}, ${r.totalExpenses}, ${r.totalSave},
      '0', '0', 'locked'
    )
    ON CONFLICT (user_id, reference_month) DO UPDATE SET
      month_label = EXCLUDED.month_label,
      total_incomes = EXCLUDED.total_incomes,
      total_expenses = EXCLUDED.total_expenses,
      total_save = EXCLUDED.total_save,
      status = 'locked'
    RETURNING (xmax = 0) AS was_inserted
  `;
  if (result[0].was_inserted) inserted++;
  else updated++;
  console.log(
    `  ${result[0].was_inserted ? "+" : "·"} ${r.monthLabel} | inc R$ ${r.totalIncomes} | exp R$ ${r.totalExpenses} | save R$ ${r.totalSave}`,
  );
}

console.log(`\n${inserted} inserted · ${updated} updated`);
await sql.end();

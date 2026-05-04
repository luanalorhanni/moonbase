// Read-only diff between Luana's spreadsheet CSVs and the DB rows.
// Reports:
//   - rows in CSV missing from DB
//   - rows in DB missing from CSV
//   - rows that match by description+date but differ on amount/parcels/etc.
// Does NOT mutate anything. Apply corrections separately after review.

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const CREDIT_CSV = "C:\\Users\\luana\\Downloads\\credit_expenses_luana.csv";
const CASH_CSV = "C:\\Users\\luana\\Downloads\\cash_expenses_luana.csv";
const USER_ID = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

/* ─── tiny CSV parser (handles quoted fields with commas) ──────────── */
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
        } else {
          inQ = false;
        }
      } else cell += c;
    } else {
      if (c === '"') inQ = true;
      else if (c === ",") {
        row.push(cell);
        cell = "";
      } else if (c === "\r") {
        // ignore
      } else if (c === "\n") {
        row.push(cell);
        out.push(row);
        row = [];
        cell = "";
      } else cell += c;
    }
  }
  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    out.push(row);
  }
  return out;
}

/* ─── helpers ──────────────────────────────────────────────────────── */
function parseBRL(s) {
  // "R$ 1.234,56" or " R$ 16,95" → 1234.56 (number)
  if (!s) return NaN;
  const cleaned = s
    .replace(/[Rr]\$\s*/g, "")
    .replace(/ /g, "")
    .trim()
    .replace(/\./g, "")
    .replace(",", ".");
  return Number(cleaned);
}
function parseDate(s) {
  // "01/05/2026" → "2026-05-01"
  if (!s) return null;
  const trimmed = s.trim();
  const m = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}
function norm(s) {
  return (s ?? "")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}
function isoDateOf(d) {
  // postgres-js returns DATE columns as JS Date — coerce to yyyy-mm-dd.
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, "0");
    const day = String(d.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }
  return null;
}
function fmtBRL(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── load CSVs ────────────────────────────────────────────────────── */
function loadCreditCsv() {
  const rows = parseCsv(readFileSync(CREDIT_CSV, "utf8")).filter((r) => r.length > 1);
  const [header, ...body] = rows;
  // Cart, Expense, Subcategory, Category, Date, Parcel, Amount, Month First, Month Last
  const all = body
    .filter((r) => r[0] && r[0].trim().length > 0)
    .map((r) => ({
      card: r[0]?.trim(),
      description: r[1]?.trim(),
      subcategory: r[2]?.trim(),
      category: r[3]?.trim(),
      date: parseDate(r[4]),
      parcels: Number(r[5]?.trim() || "1"),
      amount: parseBRL(r[6]),
      _raw: r,
    }))
    .filter((r) => r.date && Number.isFinite(r.amount));
  // Dedupe identical exported rows.
  const seen = new Set();
  const out = [];
  for (const r of all) {
    const key = `${norm(r.card)}|${norm(r.description)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  console.log(`(credit csv: ${all.length} raw rows → ${out.length} after dedup)`);
  return out;
}

function loadCashCsv() {
  const rows = parseCsv(readFileSync(CASH_CSV, "utf8")).filter((r) => r.length > 1);
  const [header, ...body] = rows;
  // Cart, Method, Expense, Subcategory, Category, Date, Amount, Month Payment
  const all = body
    .filter((r) => r[0] && r[0].trim().length > 0)
    .map((r) => {
      const method = r[1]?.trim().toLowerCase();
      // Spreadsheet labels include "Debit Cart" — normalize to "debit"
      // so it matches the DB enum.
      const normalizedMethod = method?.includes("debit")
        ? "debit"
        : method?.includes("pix")
          ? "pix"
          : method?.includes("cash")
            ? "cash"
            : method;
      return {
        card: r[0]?.trim(),
        method: normalizedMethod,
        description: r[2]?.trim(),
        subcategory: r[3]?.trim(),
        category: r[4]?.trim(),
        date: parseDate(r[5]),
        amount: parseBRL(r[6]),
        _raw: r,
      };
    })
    .filter((r) => r.date && Number.isFinite(r.amount));
  // Dedupe: the spreadsheet export massively duplicates identical rows
  // (same description / amount / date repeated 8–10×). Compare only
  // distinct entries against the DB.
  const seen = new Set();
  const out = [];
  for (const r of all) {
    const key = `${norm(r.card)}|${r.method}|${norm(r.description)}|${r.date}|${r.amount.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  console.log(`(cash csv: ${all.length} raw rows → ${out.length} after dedup)`);
  return out;
}

/* ─── load DB rows ─────────────────────────────────────────────────── */
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const dbCredit = await sql`
  SELECT
    e.id, e.description, e.purchase_date, e.total_parcels, e.parcel_value,
    c.name AS card_name,
    sub.name AS subcategory_name,
    cat.name AS category_name
  FROM credit_expenses e
  JOIN cards c ON c.id = e.card_id
  JOIN subcategories sub ON sub.id = e.subcategory_id
  JOIN categories cat ON cat.id = sub.category_id
  WHERE e.user_id = ${USER_ID}
`;

const dbCash = await sql`
  SELECT
    e.id, e.description, e.method, e.date, e.amount,
    c.name AS card_name,
    sub.name AS subcategory_name,
    cat.name AS category_name
  FROM cash_expenses e
  JOIN cards c ON c.id = e.card_id
  JOIN subcategories sub ON sub.id = e.subcategory_id
  JOIN categories cat ON cat.id = sub.category_id
  WHERE e.user_id = ${USER_ID}
`;

await sql.end();

/* ─── diff credit ──────────────────────────────────────────────────── */
// Match key avoids description (DB and CSV diverge on capitalization /
// wording). Identity is (card, date, amount, parcels) — collisions are
// possible (two coffees on the same day) so we use a Map of arrays.
function pushKey(map, key, value) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

/** Shift an ISO date by N days. */
function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}

const csvCredit = loadCreditCsv();
const csvCreditMap = new Map();
for (const r of csvCredit) {
  const key = `${norm(r.card)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`;
  pushKey(csvCreditMap, key, r);
}

const dbCreditMap = new Map();
for (const r of dbCredit) {
  const dateStr = isoDateOf(r.purchase_date);
  const key = `${norm(r.card_name)}|${dateStr}|${Number(r.parcel_value).toFixed(2)}|${r.total_parcels}`;
  pushKey(dbCreditMap, key, { ...r, purchase_date: dateStr });
}

const creditOnlyInCsv = [];
const creditOnlyInDb = [];
const creditOffByOne = []; // db is 1 day earlier than csv — likely import bug
const creditDescriptionDiffs = [];
const creditCategoryDiffs = [];

const usedDb = new Set();
function checkMatch(csv, db, exact) {
  if (norm(db.description) !== norm(csv.description)) {
    creditDescriptionDiffs.push({ csv, db, exact });
  }
  if (
    norm(db.subcategory_name) !== norm(csv.subcategory) ||
    norm(db.category_name) !== norm(csv.category)
  ) {
    creditCategoryDiffs.push({ csv, db, exact });
  }
}

for (const [key, csvList] of csvCreditMap) {
  const dbList = (dbCreditMap.get(key) ?? []).filter((d) => !usedDb.has(d.id));
  const matched = Math.min(csvList.length, dbList.length);
  for (let i = 0; i < matched; i++) {
    usedDb.add(dbList[i].id);
    checkMatch(csvList[i], dbList[i], true);
  }
  // Try the off-by-one fallback for unmatched csv rows.
  for (let i = matched; i < csvList.length; i++) {
    const csv = csvList[i];
    const altKey = `${norm(csv.card)}|${shiftIso(csv.date, -1)}|${csv.amount.toFixed(2)}|${csv.parcels}`;
    const altList = (dbCreditMap.get(altKey) ?? []).filter((d) => !usedDb.has(d.id));
    if (altList.length > 0) {
      const db = altList[0];
      usedDb.add(db.id);
      creditOffByOne.push({ csv, db });
      checkMatch(csv, db, false);
    } else {
      creditOnlyInCsv.push(csv);
    }
  }
}
for (const r of dbCredit) {
  if (!usedDb.has(r.id)) creditOnlyInDb.push({ ...r, purchase_date: isoDateOf(r.purchase_date) });
}

/* ─── diff cash ────────────────────────────────────────────────────── */
const csvCash = loadCashCsv();
const csvCashMap = new Map();
for (const r of csvCash) {
  const key = `${norm(r.card)}|${r.method}|${r.date}|${r.amount.toFixed(2)}`;
  pushKey(csvCashMap, key, r);
}
const dbCashMap = new Map();
for (const r of dbCash) {
  const dateStr = isoDateOf(r.date);
  const key = `${norm(r.card_name)}|${r.method}|${dateStr}|${Number(r.amount).toFixed(2)}`;
  pushKey(dbCashMap, key, { ...r, date: dateStr });
}

const cashOnlyInCsv = [];
const cashOnlyInDb = [];
const cashOffByOne = [];
const cashDescriptionDiffs = [];
const cashCategoryDiffs = [];

const usedDbCash = new Set();
function checkCashMatch(csv, db, exact) {
  if (norm(db.description) !== norm(csv.description)) {
    cashDescriptionDiffs.push({ csv, db, exact });
  }
  if (
    norm(db.subcategory_name) !== norm(csv.subcategory) ||
    norm(db.category_name) !== norm(csv.category)
  ) {
    cashCategoryDiffs.push({ csv, db, exact });
  }
}

for (const [key, csvList] of csvCashMap) {
  const dbList = (dbCashMap.get(key) ?? []).filter((d) => !usedDbCash.has(d.id));
  const matched = Math.min(csvList.length, dbList.length);
  for (let i = 0; i < matched; i++) {
    usedDbCash.add(dbList[i].id);
    checkCashMatch(csvList[i], dbList[i], true);
  }
  for (let i = matched; i < csvList.length; i++) {
    const csv = csvList[i];
    const altKey = `${norm(csv.card)}|${csv.method}|${shiftIso(csv.date, -1)}|${csv.amount.toFixed(2)}`;
    const altList = (dbCashMap.get(altKey) ?? []).filter((d) => !usedDbCash.has(d.id));
    if (altList.length > 0) {
      const db = altList[0];
      usedDbCash.add(db.id);
      cashOffByOne.push({ csv, db });
      checkCashMatch(csv, db, false);
    } else {
      cashOnlyInCsv.push(csv);
    }
  }
}
for (const r of dbCash) {
  if (!usedDbCash.has(r.id)) cashOnlyInDb.push({ ...r, date: isoDateOf(r.date) });
}

/* ─── report ───────────────────────────────────────────────────────── */
console.log("\n══════ CREDIT ══════\n");
console.log(`CSV rows: ${csvCredit.length} | DB rows: ${dbCredit.length}`);
console.log(`Off-by-one date:   ${creditOffByOne.length}  (DB date is 1 day earlier than CSV)`);
console.log(`Description diffs: ${creditDescriptionDiffs.length}`);
console.log(`Category diffs:    ${creditCategoryDiffs.length}`);
console.log(`Only in CSV:       ${creditOnlyInCsv.length}`);
console.log(`Only in DB:        ${creditOnlyInDb.length}`);

if (creditOnlyInCsv.length) {
  console.log("\n— only in CSV (missing from DB) —");
  for (const r of creditOnlyInCsv) {
    console.log(
      `  · ${r.card} | ${r.description} | ${r.date} | ${r.parcels}× ${fmtBRL(r.amount)} | ${r.subcategory}/${r.category}`,
    );
  }
}
if (creditOnlyInDb.length) {
  console.log("\n— only in DB (not in CSV) —");
  for (const r of creditOnlyInDb) {
    console.log(
      `  · ${r.card_name} | ${r.description} | ${r.purchase_date} | ${r.total_parcels}× ${fmtBRL(r.parcel_value)}`,
    );
  }
}
if (creditDescriptionDiffs.length) {
  console.log("\n— description diffs (same row, different text) —");
  for (const { csv, db } of creditDescriptionDiffs) {
    console.log(
      `  · ${csv.card} | ${csv.date} | ${fmtBRL(csv.amount)}\n      db: "${db.description}"\n     csv: "${csv.description}"`,
    );
  }
}
if (creditCategoryDiffs.length) {
  console.log("\n— category diffs —");
  for (const { csv, db } of creditCategoryDiffs) {
    console.log(
      `  · ${csv.card} | ${csv.description.slice(0, 40)} | ${csv.date}\n      db: ${db.subcategory_name}/${db.category_name}\n     csv: ${csv.subcategory}/${csv.category}`,
    );
  }
}

console.log("\n══════ CASH ══════\n");
console.log(`CSV rows: ${csvCash.length} | DB rows: ${dbCash.length}`);
console.log(`Off-by-one date:   ${cashOffByOne.length}  (DB date is 1 day earlier than CSV)`);
console.log(`Description diffs: ${cashDescriptionDiffs.length}`);
console.log(`Category diffs:    ${cashCategoryDiffs.length}`);
console.log(`Only in CSV:       ${cashOnlyInCsv.length}`);
console.log(`Only in DB:        ${cashOnlyInDb.length}`);

if (cashOnlyInCsv.length) {
  console.log("\n— only in CSV —");
  for (const r of cashOnlyInCsv) {
    console.log(
      `  · ${r.card} | ${r.method} | ${r.description} | ${r.date} | ${fmtBRL(r.amount)} | ${r.subcategory}/${r.category}`,
    );
  }
}
if (cashOnlyInDb.length) {
  console.log("\n— only in DB —");
  for (const r of cashOnlyInDb) {
    console.log(
      `  · ${r.card_name} | ${r.method} | ${r.description} | ${r.date} | ${fmtBRL(r.amount)}`,
    );
  }
}
if (cashDescriptionDiffs.length) {
  console.log("\n— description diffs —");
  for (const { csv, db } of cashDescriptionDiffs) {
    console.log(
      `  · ${csv.card} | ${csv.method} | ${csv.date} | ${fmtBRL(csv.amount)}\n      db: "${db.description}"\n     csv: "${csv.description}"`,
    );
  }
}
if (cashCategoryDiffs.length) {
  console.log("\n— category diffs —");
  for (const { csv, db } of cashCategoryDiffs) {
    console.log(
      `  · ${csv.card} | ${csv.description.slice(0, 40)} | ${csv.date}\n      db: ${db.subcategory_name}/${db.category_name}\n     csv: ${csv.subcategory}/${csv.category}`,
    );
  }
}

console.log("\nDone — read-only.");

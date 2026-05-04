// Apply the fixes identified by diff-expenses.mjs:
//   1. credit_expenses: shift purchase_date +1 day on rows that were 1 day
//      earlier than the CSV (timezone bug from initial import).
//   2. credit_expenses: fix one description ("compras no mateus" → "Compras Mateus").
//   3. credit_expenses: insert 6 rows missing from the DB.
//   4. cash_expenses: shift date +1 day on 44 rows.
//   5. cash_expenses: fix method (pix → debit) AND shift date +1 on 13 rows.
//   6. cash_expenses: insert 2 missing rows.
//
// User authorized one-shot execution. Prints what's done as it goes.

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const CREDIT_CSV = "C:\\Users\\luana\\Downloads\\credit_expenses_luana.csv";
const CASH_CSV = "C:\\Users\\luana\\Downloads\\cash_expenses_luana.csv";
const USER_ID = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

/* ─── helpers (mirror diff-expenses.mjs) ────────────────────────────── */
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
function parseBRL(s) {
  if (!s) return NaN;
  return Number(
    s
      .replace(/[Rr]\$\s*/g, "")
      .replace(/ /g, "")
      .trim()
      .replace(/\./g, "")
      .replace(",", "."),
  );
}
function parseDate(s) {
  if (!s) return null;
  const m = s.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : null;
}
function norm(s) {
  return (s ?? "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
}
function isoDateOf(d) {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  return null;
}
function shiftIso(iso, days) {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + days));
  return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, "0")}-${String(t.getUTCDate()).padStart(2, "0")}`;
}
function pushKey(map, key, value) {
  const a = map.get(key);
  if (a) a.push(value);
  else map.set(key, [value]);
}

/* ─── load + dedupe CSVs ───────────────────────────────────────────── */
function loadCreditCsv() {
  const rows = parseCsv(readFileSync(CREDIT_CSV, "utf8")).filter((r) => r.length > 1);
  const [, ...body] = rows;
  const all = body
    .filter((r) => r[0]?.trim())
    .map((r) => ({
      card: r[0].trim(),
      description: r[1].trim(),
      subcategory: r[2].trim(),
      category: r[3].trim(),
      date: parseDate(r[4]),
      parcels: Number(r[5]?.trim() || "1"),
      amount: parseBRL(r[6]),
    }))
    .filter((r) => r.date && Number.isFinite(r.amount));
  const seen = new Set();
  return all.filter((r) => {
    const k = `${norm(r.card)}|${norm(r.description)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}
function loadCashCsv() {
  const rows = parseCsv(readFileSync(CASH_CSV, "utf8")).filter((r) => r.length > 1);
  const [, ...body] = rows;
  const all = body
    .filter((r) => r[0]?.trim())
    .map((r) => {
      const m = r[1]?.trim().toLowerCase();
      const method = m?.includes("debit")
        ? "debit"
        : m?.includes("pix")
          ? "pix"
          : m?.includes("cash")
            ? "cash"
            : m;
      return {
        card: r[0].trim(),
        method,
        description: r[2].trim(),
        subcategory: r[3].trim(),
        category: r[4].trim(),
        date: parseDate(r[5]),
        amount: parseBRL(r[6]),
      };
    })
    .filter((r) => r.date && Number.isFinite(r.amount));
  const seen = new Set();
  return all.filter((r) => {
    const k = `${norm(r.card)}|${r.method}|${norm(r.description)}|${r.date}|${r.amount.toFixed(2)}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

/* ─── connect + load DB ────────────────────────────────────────────── */
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const cards = await sql`SELECT id, name FROM cards WHERE user_id = ${USER_ID}`;
const cardByName = new Map(cards.map((c) => [norm(c.name), c.id]));

const subcats = await sql`
  SELECT sub.id, sub.name AS sub_name, cat.name AS cat_name
  FROM subcategories sub
  JOIN categories cat ON cat.id = sub.category_id
  WHERE sub.user_id = ${USER_ID}
`;
const subByPair = new Map(subcats.map((s) => [`${norm(s.sub_name)}|${norm(s.cat_name)}`, s.id]));

function lookupCardId(name) {
  const id = cardByName.get(norm(name));
  if (!id) throw new Error(`card not found: ${name}`);
  return id;
}
function lookupSubcategoryId(sub, cat) {
  const id = subByPair.get(`${norm(sub)}|${norm(cat)}`);
  if (!id) throw new Error(`subcategory not found: ${sub} / ${cat}`);
  return id;
}

const dbCredit = await sql`
  SELECT e.id, e.description, e.purchase_date, e.total_parcels, e.parcel_value, e.card_id, c.name AS card_name
  FROM credit_expenses e JOIN cards c ON c.id = e.card_id
  WHERE e.user_id = ${USER_ID}
`;
const dbCash = await sql`
  SELECT e.id, e.description, e.method, e.date, e.amount, e.card_id, c.name AS card_name
  FROM cash_expenses e JOIN cards c ON c.id = e.card_id
  WHERE e.user_id = ${USER_ID}
`;

/* ─── plan ─────────────────────────────────────────────────────────── */

const csvCredit = loadCreditCsv();
const csvCash = loadCashCsv();

const csvCreditMap = new Map();
for (const r of csvCredit) {
  pushKey(csvCreditMap, `${norm(r.card)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`, r);
}
const dbCreditMap = new Map();
for (const r of dbCredit) {
  pushKey(
    dbCreditMap,
    `${norm(r.card_name)}|${isoDateOf(r.purchase_date)}|${Number(r.parcel_value).toFixed(2)}|${r.total_parcels}`,
    { ...r, purchase_date: isoDateOf(r.purchase_date) },
  );
}

const creditDateShifts = []; // { id, from, to }
const creditDescriptionFix = []; // { id, from, to }
const creditInserts = []; // csv rows to insert

const usedDb = new Set();
for (const [key, csvList] of csvCreditMap) {
  const exact = (dbCreditMap.get(key) ?? []).filter((d) => !usedDb.has(d.id));
  const matched = Math.min(csvList.length, exact.length);
  for (let i = 0; i < matched; i++) {
    usedDb.add(exact[i].id);
    if (norm(exact[i].description) !== norm(csvList[i].description)) {
      creditDescriptionFix.push({
        id: exact[i].id,
        from: exact[i].description,
        to: csvList[i].description,
      });
    }
  }
  for (let i = matched; i < csvList.length; i++) {
    const csv = csvList[i];
    const altKey = `${norm(csv.card)}|${shiftIso(csv.date, -1)}|${csv.amount.toFixed(2)}|${csv.parcels}`;
    const alt = (dbCreditMap.get(altKey) ?? []).filter((d) => !usedDb.has(d.id));
    if (alt.length > 0) {
      const db = alt[0];
      usedDb.add(db.id);
      creditDateShifts.push({ id: db.id, from: db.purchase_date, to: csv.date });
      if (norm(db.description) !== norm(csv.description)) {
        creditDescriptionFix.push({ id: db.id, from: db.description, to: csv.description });
      }
    } else {
      creditInserts.push(csv);
    }
  }
}

/* cash plan */
const csvCashMap = new Map();
for (const r of csvCash) {
  pushKey(csvCashMap, `${norm(r.card)}|${r.method}|${r.date}|${r.amount.toFixed(2)}`, r);
}
const dbCashMap = new Map();
for (const r of dbCash) {
  pushKey(
    dbCashMap,
    `${norm(r.card_name)}|${r.method}|${isoDateOf(r.date)}|${Number(r.amount).toFixed(2)}`,
    { ...r, date: isoDateOf(r.date) },
  );
}

const cashDateShifts = [];
const cashMethodAndDateFix = []; // pix → debit + shift +1
const cashInserts = [];

const usedDbCash = new Set();
for (const [key, csvList] of csvCashMap) {
  const exact = (dbCashMap.get(key) ?? []).filter((d) => !usedDbCash.has(d.id));
  const matched = Math.min(csvList.length, exact.length);
  for (let i = 0; i < matched; i++) usedDbCash.add(exact[i].id);
  for (let i = matched; i < csvList.length; i++) {
    const csv = csvList[i];
    // Try same method, date - 1
    const altKey = `${norm(csv.card)}|${csv.method}|${shiftIso(csv.date, -1)}|${csv.amount.toFixed(2)}`;
    const alt = (dbCashMap.get(altKey) ?? []).filter((d) => !usedDbCash.has(d.id));
    if (alt.length > 0) {
      const db = alt[0];
      usedDbCash.add(db.id);
      cashDateShifts.push({ id: db.id, from: db.date, to: csv.date });
      continue;
    }
    // Try wrong method (pix instead of debit) AND date - 1
    if (csv.method === "debit") {
      const altMethodKey = `${norm(csv.card)}|pix|${shiftIso(csv.date, -1)}|${csv.amount.toFixed(2)}`;
      const altMethod = (dbCashMap.get(altMethodKey) ?? []).filter((d) => !usedDbCash.has(d.id));
      if (altMethod.length > 0) {
        const db = altMethod[0];
        usedDbCash.add(db.id);
        cashMethodAndDateFix.push({
          id: db.id,
          fromDate: db.date,
          toDate: csv.date,
          fromMethod: db.method,
          toMethod: csv.method,
        });
        continue;
      }
    }
    cashInserts.push(csv);
  }
}

/* ─── apply ────────────────────────────────────────────────────────── */
console.log("\n══ applying credit fixes ══");
let counters = {
  creditShift: 0,
  creditDesc: 0,
  creditInsert: 0,
  cashShift: 0,
  cashMethod: 0,
  cashInsert: 0,
};

for (const u of creditDateShifts) {
  await sql`UPDATE credit_expenses SET purchase_date = ${u.to} WHERE id = ${u.id} AND user_id = ${USER_ID}`;
  counters.creditShift++;
}
console.log(`✓ shifted ${counters.creditShift} credit dates +1 day`);

for (const u of creditDescriptionFix) {
  await sql`UPDATE credit_expenses SET description = ${u.to} WHERE id = ${u.id} AND user_id = ${USER_ID}`;
  counters.creditDesc++;
  console.log(`  · "${u.from}" → "${u.to}"`);
}
if (counters.creditDesc) console.log(`✓ fixed ${counters.creditDesc} credit descriptions`);

for (const r of creditInserts) {
  const cardId = lookupCardId(r.card);
  const subId = lookupSubcategoryId(r.subcategory, r.category);
  await sql`
    INSERT INTO credit_expenses (
      user_id, description, card_id, subcategory_id, purchase_date,
      total_parcels, parcel_value
    ) VALUES (
      ${USER_ID}, ${r.description}, ${cardId}, ${subId}, ${r.date},
      ${r.parcels}, ${r.amount.toFixed(2)}
    )
  `;
  counters.creditInsert++;
  console.log(
    `  + ${r.card} | ${r.description} | ${r.date} | ${r.parcels}× R$ ${r.amount.toFixed(2)}`,
  );
}
if (counters.creditInsert) console.log(`✓ inserted ${counters.creditInsert} credit rows`);

console.log("\n══ applying cash fixes ══");

for (const u of cashDateShifts) {
  await sql`UPDATE cash_expenses SET date = ${u.to} WHERE id = ${u.id} AND user_id = ${USER_ID}`;
  counters.cashShift++;
}
console.log(`✓ shifted ${counters.cashShift} cash dates +1 day`);

for (const u of cashMethodAndDateFix) {
  await sql`
    UPDATE cash_expenses
    SET method = ${u.toMethod}::cash_method, date = ${u.toDate}
    WHERE id = ${u.id} AND user_id = ${USER_ID}
  `;
  counters.cashMethod++;
}
console.log(`✓ fixed method+date on ${counters.cashMethod} cash rows`);

for (const r of cashInserts) {
  const cardId = lookupCardId(r.card);
  const subId = lookupSubcategoryId(r.subcategory, r.category);
  await sql`
    INSERT INTO cash_expenses (
      user_id, description, card_id, method, subcategory_id, date, amount
    ) VALUES (
      ${USER_ID}, ${r.description}, ${cardId}, ${r.method}::cash_method,
      ${subId}, ${r.date}, ${r.amount.toFixed(2)}
    )
  `;
  counters.cashInsert++;
  console.log(
    `  + ${r.card} | ${r.method} | ${r.description} | ${r.date} | R$ ${r.amount.toFixed(2)}`,
  );
}
if (counters.cashInsert) console.log(`✓ inserted ${counters.cashInsert} cash rows`);

console.log("\n══ summary ══");
console.log(JSON.stringify(counters, null, 2));

await sql.end();

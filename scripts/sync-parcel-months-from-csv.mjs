// Use the spreadsheet's "Month of First Parcel" / "Month of Last Parcel"
// columns as the source of truth and overwrite the DB's derived
// first_parcel_month / last_parcel_month on rows that diverge. The
// closing dates (first_parcel_date / last_parcel_date) are kept in
// sync by re-deriving them from the new closing months — same closing
// day as before, just shifted to whichever month the spreadsheet says
// the bill cycle covers.

import { config } from "dotenv";
import { readFileSync } from "node:fs";
import postgres from "postgres";

config({ path: ".env.local" });

const CREDIT_CSV = "C:\\Users\\luana\\Downloads\\credit_expenses_luana.csv";
const USER = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

/* ─── helpers ──────────────────────────────────────────────────────── */
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
    s.replace(/[Rr]\$\s*/g, "").replace(/ /g, "").trim().replace(/\./g, "").replace(",", "."),
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
function pad(n) {
  return String(n).padStart(2, "0");
}

const PT_MONTHS = {
  janeiro: "01", fevereiro: "02", marco: "03", março: "03",
  abril: "04", maio: "05", junho: "06", julho: "07",
  agosto: "08", setembro: "09", outubro: "10", novembro: "11", dezembro: "12",
};
function parsePtMonth(s) {
  if (!s) return null;
  const t = s.trim().toLowerCase();
  // "junho 2026" → "2026-06-01"
  const m = t.match(/^([a-zçãéíóôú]+)\s+(\d{4})$/);
  if (!m) return null;
  const mm = PT_MONTHS[m[1].normalize("NFKD").replace(/[̀-ͯ]/g, "")];
  if (!mm) return null;
  return `${m[2]}-${mm}-01`;
}
function isoDateOf(d) {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  return null;
}
function daysInMonth(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* ─── load CSV ─────────────────────────────────────────────────────── */
const rows = parseCsv(readFileSync(CREDIT_CSV, "utf8")).filter((r) => r.length > 1);
const [, ...body] = rows;
const csvRowsRaw = body
  .filter((r) => r[0]?.trim())
  .map((r) => ({
    card: r[0].trim(),
    description: r[1].trim(),
    date: parseDate(r[4]),
    parcels: Number(r[5]?.trim() || "1"),
    amount: parseBRL(r[6]),
    monthFirst: parsePtMonth(r[7]),
    monthLast: parsePtMonth(r[8]),
  }))
  .filter((r) => r.date && Number.isFinite(r.amount) && r.monthFirst && r.monthLast);

// Dedupe identical exported rows.
const seen = new Set();
const csvRows = csvRowsRaw.filter((r) => {
  const k = `${norm(r.card)}|${norm(r.description)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`;
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
console.log(`csv: ${csvRowsRaw.length} raw → ${csvRows.length} after dedup`);

/* ─── connect + load DB ────────────────────────────────────────────── */
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const cards = await sql`SELECT id, name, default_closing_day FROM cards WHERE user_id = ${USER}`;
const cardByNorm = new Map(cards.map((c) => [norm(c.name), c]));
const cardById = new Map(cards.map((c) => [c.id, c]));

const closings = await sql`
  SELECT card_id, reference_month::text AS month, closing_day
  FROM card_closings WHERE user_id = ${USER}
`;
const closingsByKey = new Map();
for (const o of closings) {
  closingsByKey.set(`${o.card_id}|${o.month.slice(0, 7)}`, o.closing_day);
}
function closingDayFor(cardId, monthYyyymm) {
  return (
    closingsByKey.get(`${cardId}|${monthYyyymm}`) ??
    cardById.get(cardId)?.default_closing_day ??
    null
  );
}

const dbExpenses = await sql`
  SELECT e.id, e.card_id, e.description, e.purchase_date::text AS pd, e.total_parcels,
         e.parcel_value::text AS pv,
         e.first_parcel_month::text AS fpm, e.last_parcel_month::text AS lpm,
         c.name AS card_name
  FROM credit_expenses e JOIN cards c ON c.id = e.card_id
  WHERE e.user_id = ${USER}
`;

const dbByKey = new Map();
for (const r of dbExpenses) {
  const key = `${norm(r.card_name)}|${r.pd}|${Number(r.pv).toFixed(2)}|${r.total_parcels}`;
  if (!dbByKey.has(key)) dbByKey.set(key, []);
  dbByKey.get(key).push(r);
}

/* ─── plan ─────────────────────────────────────────────────────────── */
const updates = []; // { id, fpm, lpm, fpd, lpd, oldFpm, oldLpm }
let matched = 0;
const unmatchedRows = [];
const usedDb = new Set();

for (const c of csvRows) {
  const key = `${norm(c.card)}|${c.date}|${c.amount.toFixed(2)}|${c.parcels}`;
  let candidates = (dbByKey.get(key) ?? []).filter((d) => !usedDb.has(d.id));
  if (candidates.length === 0) {
    unmatchedRows.push(c);
    continue;
  }
  const db = candidates[0];
  usedDb.add(db.id);
  matched++;

  const csvFpm = c.monthFirst;
  const csvLpm = c.monthLast;
  if (db.fpm === csvFpm && db.lpm === csvLpm) continue;

  // Closing date = closing day of the month BEFORE the parcel month
  // (the bill closes one month before it's paid). Use the card's
  // closing day for that closing month, with override fallback.
  function closingDateFor(parcelMonth) {
    const [y, m] = parcelMonth.split("-").map(Number);
    // Closing month = parcel month - 1
    const cy = m === 1 ? y - 1 : y;
    const cm = m === 1 ? 12 : m - 1;
    const closingMonth = `${cy}-${pad(cm)}`;
    const cd = closingDayFor(db.card_id, closingMonth) ?? cardById.get(db.card_id)?.default_closing_day ?? 1;
    const last = daysInMonth(closingMonth);
    return `${closingMonth}-${pad(Math.min(cd, last))}`;
  }

  updates.push({
    id: db.id,
    description: db.description,
    card: db.card_name,
    pd: db.pd,
    parcels: db.total_parcels,
    fpm: csvFpm,
    lpm: csvLpm,
    fpd: closingDateFor(csvFpm),
    lpd: closingDateFor(csvLpm),
    oldFpm: db.fpm,
    oldLpm: db.lpm,
  });
}

console.log(`matched: ${matched}, unmatched: ${unmatchedRows.length}, divergent: ${updates.length}`);

if (unmatchedRows.length) {
  console.log("\n— unmatched (CSV row not found in DB by card+date+amount+parcels) —");
  for (const u of unmatchedRows) {
    console.log(
      `  · ${u.card} | ${u.description} | ${u.date} | ${u.parcels}× ${u.amount.toFixed(2)} | csv months ${u.monthFirst}→${u.monthLast}`,
    );
  }
}

if (updates.length > 0) {
  console.log("\n— first 15 divergences —");
  for (const u of updates.slice(0, 15)) {
    console.log(
      `  · ${u.card} | ${u.description} | ${u.pd} | ${u.parcels}× | DB ${u.oldFpm}→${u.oldLpm} → CSV ${u.fpm}→${u.lpm}`,
    );
  }
  if (updates.length > 15) console.log(`  … and ${updates.length - 15} more`);

  if (process.argv.includes("--apply")) {
    console.log("\n— applying —");
    for (const u of updates) {
      await sql`
        UPDATE credit_expenses
        SET first_parcel_month = ${u.fpm},
            last_parcel_month = ${u.lpm},
            first_parcel_date = ${u.fpd},
            last_parcel_date = ${u.lpd}
        WHERE id = ${u.id} AND user_id = ${USER}
      `;
    }
    console.log(`✓ applied ${updates.length} updates`);
  } else {
    console.log("\n(dry-run — re-run with --apply to write changes)");
  }
}

await sql.end();
console.log("done.");

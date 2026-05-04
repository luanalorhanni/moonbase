// Recompute first_parcel_month / last_parcel_month / first_parcel_date /
// last_parcel_date for every credit_expense and credit_receivable, using
// the new "paid month" convention (firstParcelMonth = month after the
// statement closes, not the closing month itself).

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const USER = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

/* ─── helpers ──────────────────────────────────────────────────────── */
function pad(n) {
  return String(n).padStart(2, "0");
}
function isoDateOf(d) {
  if (typeof d === "string") return d.slice(0, 10);
  if (d instanceof Date) {
    return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
  }
  return null;
}
/** Add `months` to a "yyyy-mm-01" string and return a new "yyyy-mm-01". */
function addMonth(yyyymm, months) {
  const [y, m] = yyyymm.split("-").map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  return `${ny}-${pad(nm)}-01`;
}
/** Last day of yyyy-mm. */
function daysInMonth(yyyymm) {
  const [y, m] = yyyymm.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

/* ─── load cards + overrides ───────────────────────────────────────── */
const cards = await sql`
  SELECT id, default_closing_day FROM cards WHERE user_id = ${USER}
`;
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
  const ov = closingsByKey.get(`${cardId}|${monthYyyymm}`);
  if (ov != null) return ov;
  return cardById.get(cardId)?.default_closing_day ?? null;
}

/* ─── core compute (mirrors lib/finance/parcels.ts new convention) ── */
function compute({ cardId, purchaseDate, totalParcels }) {
  const purchaseMonth = purchaseDate.slice(0, 7); // yyyy-mm
  const purchaseDay = Number(purchaseDate.slice(8, 10));
  const closingDay = closingDayFor(cardId, purchaseMonth);
  if (closingDay == null) {
    return null; // skip — no closing day configured
  }
  const firstClosingMonth =
    purchaseDay <= closingDay ? `${purchaseMonth}-01` : addMonth(`${purchaseMonth}-01`, 1);
  const firstParcelMonth = addMonth(firstClosingMonth, 1);
  const lastClosingMonth = addMonth(firstClosingMonth, totalParcels - 1);
  const lastParcelMonth = addMonth(lastClosingMonth, 1);

  // Closing dates: clamped to actual last day of each closing month
  function closingDate(monthIso) {
    const yyyymm = monthIso.slice(0, 7);
    const cd = closingDayFor(cardId, yyyymm) ?? closingDay;
    const last = daysInMonth(yyyymm);
    const day = Math.min(cd, last);
    return `${yyyymm}-${pad(day)}`;
  }

  return {
    firstParcelMonth,
    lastParcelMonth,
    firstParcelDate: closingDate(firstClosingMonth),
    lastParcelDate: closingDate(lastClosingMonth),
  };
}

/* ─── recompute credit_expenses ────────────────────────────────────── */
const expenses = await sql`
  SELECT id, card_id, purchase_date::text AS purchase_date, total_parcels,
         first_parcel_month::text AS old_first, last_parcel_month::text AS old_last
  FROM credit_expenses WHERE user_id = ${USER}
`;

let updatedExp = 0,
  skippedExp = 0,
  sameExp = 0;
for (const e of expenses) {
  const r = compute({
    cardId: e.card_id,
    purchaseDate: e.purchase_date,
    totalParcels: e.total_parcels,
  });
  if (!r) {
    skippedExp++;
    continue;
  }
  if (
    isoDateOf(e.old_first) === r.firstParcelMonth.slice(0, 10) &&
    isoDateOf(e.old_last) === r.lastParcelMonth.slice(0, 10)
  ) {
    sameExp++;
    continue;
  }
  await sql`
    UPDATE credit_expenses
    SET first_parcel_month = ${r.firstParcelMonth},
        last_parcel_month = ${r.lastParcelMonth},
        first_parcel_date = ${r.firstParcelDate},
        last_parcel_date = ${r.lastParcelDate}
    WHERE id = ${e.id} AND user_id = ${USER}
  `;
  updatedExp++;
}

console.log(
  `credit_expenses: ${updatedExp} updated · ${sameExp} unchanged · ${skippedExp} skipped (no closing day)`,
);

/* ─── recompute credit_receivables ─────────────────────────────────── */
const recv = await sql`
  SELECT id, card_id, purchase_date::text AS purchase_date, total_parcels,
         first_parcel_month::text AS old_first, last_parcel_month::text AS old_last
  FROM credit_receivables WHERE user_id = ${USER}
`;

let updatedRecv = 0,
  skippedRecv = 0,
  sameRecv = 0;
for (const r of recv) {
  const computed = compute({
    cardId: r.card_id,
    purchaseDate: r.purchase_date,
    totalParcels: r.total_parcels,
  });
  if (!computed) {
    skippedRecv++;
    continue;
  }
  if (
    isoDateOf(r.old_first) === computed.firstParcelMonth.slice(0, 10) &&
    isoDateOf(r.old_last) === computed.lastParcelMonth.slice(0, 10)
  ) {
    sameRecv++;
    continue;
  }
  await sql`
    UPDATE credit_receivables
    SET first_parcel_month = ${computed.firstParcelMonth},
        last_parcel_month = ${computed.lastParcelMonth},
        first_parcel_date = ${computed.firstParcelDate},
        last_parcel_date = ${computed.lastParcelDate}
    WHERE id = ${r.id} AND user_id = ${USER}
  `;
  updatedRecv++;
}

console.log(
  `credit_receivables: ${updatedRecv} updated · ${sameRecv} unchanged · ${skippedRecv} skipped`,
);

await sql.end();
console.log("done.");

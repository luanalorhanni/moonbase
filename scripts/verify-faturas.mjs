// Verify the actual bank statements (BB PDF + Nubank CSV) against the
// DB. Tells us which fatura lines have no DB row, and which DB rows
// exist that don't appear on either bill.

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const USER_ID = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

/* ─── FATURAS ──────────────────────────────────────────────────────── */
// Each row: [purchaseDate (yyyy-mm-dd, may be approximate for parc>1),
//            parcelValue, totalParcels, originalDescription]

// Banco do Brasil — fatura abril (vencimento 05/04, fechamento 25/03).
const BB_FATURA = [
  // single charges
  { date: "2026-02-22", amount: 29.48, parcels: 1, desc: "IFD*DENIS BARROS LOBO" },
  { date: "2026-03-12", amount: 7.95, parcels: 1, desc: "IFD*iFood Osasco" },
  { date: "2026-03-06", amount: 12.9, parcels: 1, desc: "UBER PENDING" },
  // 2026-03-09 -12.90 (estorno) — ignored
  // parcels
  { date: "2025-07-19", amount: 100.0, parcels: 10, desc: "OticasEvidenc PARC 08/10" },
  { date: "2025-09-09", amount: 25.9, parcels: 12, desc: "RESPONDE AI PARC 07/12" },
  { date: "2025-10-15", amount: 202.91, parcels: 12, desc: "HUBLA HBL PARC 06/12" },
  { date: "2025-12-24", amount: 417.47, parcels: 6, desc: "DECOLAR PARC 03/06" },
  { date: "2026-02-06", amount: 102.61, parcels: 12, desc: "JIM.COM SOPHI PARC 02/12" },
];

// Nubank — fatura with due 2026-05-05.
const NUBANK_FATURA = [
  // single charges (mostly Apr 2026)
  { date: "2026-04-27", amount: 40.9, parcels: 1, desc: "Spotify" },
  { date: "2026-04-25", amount: 4.08, parcels: 1, desc: "Uber" },
  { date: "2026-04-21", amount: 35.43, parcels: 1, desc: "Frosty Cohatrac" },
  { date: "2026-04-21", amount: 23.0, parcels: 1, desc: "Mk Ilha" },
  { date: "2026-04-21", amount: 20.0, parcels: 1, desc: "Loucos Por Coxinha" },
  { date: "2026-04-21", amount: 36.0, parcels: 1, desc: "Lucianoveigada" },
  { date: "2026-04-18", amount: 64.0, parcels: 1, desc: "Dona Licor Acessorios" },
  { date: "2026-04-18", amount: 17.99, parcels: 1, desc: "Pague Menos" },
  { date: "2026-04-17", amount: 9.0, parcels: 1, desc: "R P Cunha" },
  { date: "2026-04-13", amount: 35.0, parcels: 1, desc: "Canva" },
  { date: "2026-04-12", amount: 48.0, parcels: 1, desc: "Churras do Cearazinho" },
  { date: "2026-04-10", amount: 20.0, parcels: 1, desc: "P J Refeicoes" },
  { date: "2026-04-10", amount: 26.0, parcels: 1, desc: "G Latte Sapore" },
  { date: "2026-04-05", amount: 14.99, parcels: 1, desc: "Google One" },
  { date: "2026-04-04", amount: 6.96, parcels: 1, desc: "Uber" },
  { date: "2026-04-04", amount: 11.35, parcels: 1, desc: "Franciscorocha" },
  { date: "2026-04-03", amount: 63.0, parcels: 1, desc: "Nivaci de Freitas" },
  // parcels (date is original purchase date for parc 1/N, posting date otherwise)
  { date: "2026-04-20", amount: 9.0, parcels: 2, desc: "Steam (P1/2)" },
  { date: "2026-04-08", amount: 57.48, parcels: 3, desc: "Meapleingress (P1/3)" },
  { date: "2026-04-02", amount: 48.0, parcels: 2, desc: "Karlabiancada (P1/2)" },
  { date: "2026-03-29", amount: 47.88, parcels: 2, desc: "Drogasil (P2/2)" },
  { date: "2026-03-29", amount: 54.92, parcels: 3, desc: "Amazon Marketplace (P2/3)" },
  { date: "2026-03-29", amount: 29.37, parcels: 2, desc: "Pag Steam (P2/2)" },
  { date: "2026-03-29", amount: 76.3, parcels: 12, desc: "Alura (P6/12)" },
  { date: "2026-03-29", amount: 50.0, parcels: 4, desc: "Bdg Bar (P3/4)" },
  { date: "2026-03-29", amount: 66.96, parcels: 6, desc: "Shopee Parpinellimvei (P4/6)" },
  { date: "2026-03-29", amount: 59.99, parcels: 2, desc: "Amazon (P2/2)" },
  { date: "2026-03-29", amount: 180.0, parcels: 10, desc: "Loumar Turismo (P5/10)" },
  { date: "2026-03-29", amount: 106.3, parcels: 3, desc: "OLX (P2/3)" },
];

function fmt(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const dbCredit = await sql`
  SELECT e.id, e.description, e.purchase_date::text AS purchase_date,
         e.total_parcels, e.parcel_value, c.name AS card_name
  FROM credit_expenses e JOIN cards c ON c.id = e.card_id
  WHERE e.user_id = ${USER_ID}
`;

const dbFixed = await sql`
  SELECT f.id, f.description, f.monthly_amount, c.name AS card_name
  FROM fixed_expenses f JOIN cards c ON c.id = f.card_id
  WHERE f.user_id = ${USER_ID} AND f.payment_method = 'credit' AND f.is_active = true
`;

const dbRecv = await sql`
  SELECT r.id, r.description, r.purchase_date::text AS purchase_date,
         r.total_parcels, r.parcel_value, c.name AS card_name
  FROM credit_receivables r JOIN cards c ON c.id = r.card_id
  WHERE r.user_id = ${USER_ID}
`;

await sql.end();

function daysBetween(isoA, isoB) {
  const [y1, m1, d1] = isoA.split("-").map(Number);
  const [y2, m2, d2] = isoB.split("-").map(Number);
  const a = Date.UTC(y1, m1 - 1, d1);
  const b = Date.UTC(y2, m2 - 1, d2);
  return Math.abs((a - b) / 86400000);
}

const usedDb = new Set();
const usedFixed = new Set();

/**
 * Find a credit_expenses row matching the fatura line:
 *  - same card and exact (parcel_value, total_parcels)
 *  - for singles: purchase_date within ±5 days of fatura date
 *  - for parcels: purchase_date within total_parcels months of fatura date
 *  - never reuse a row already matched to another line
 */
function findCreditMatch(card, parcels, amount, faturaDate) {
  const candidates = dbCredit.filter(
    (r) =>
      !usedDb.has(r.id) &&
      r.card_name === card &&
      Number(r.total_parcels) === parcels &&
      Math.abs(Number(r.parcel_value) - amount) < 0.02,
  );
  if (candidates.length === 0) return null;
  // Sort by date proximity to the fatura date.
  candidates.sort(
    (a, b) => daysBetween(a.purchase_date, faturaDate) - daysBetween(b.purchase_date, faturaDate),
  );
  const best = candidates[0];
  const dist = daysBetween(best.purchase_date, faturaDate);
  // Tolerance: ±10 days for singles, ±60 days × N for parcels (N can
  // be billed up to N months out from the original purchase).
  const tol = parcels === 1 ? 10 : 35 * parcels;
  if (dist > tol) return null;
  usedDb.add(best.id);
  return best;
}

function findFixedMatch(card, amount) {
  const r = dbFixed.find(
    (r) =>
      !usedFixed.has(r.id) &&
      r.card_name === card &&
      Math.abs(Number(r.monthly_amount) - amount) < 0.02,
  );
  if (r) usedFixed.add(r.id);
  return r ?? null;
}

const usedRecv = new Set();

/**
 * Try to identify the fatura line as `expense + receivable` parcels of
 * the same card and total_parcels that sum (approximately) to the
 * line's amount. Used for trips paid with reimbursements (Loumar
 * Turismo, Decolar, etc.) where the user splits the charge.
 */
function findReceivableMatch(card, parcels, amount) {
  // Expense alone with same parcels but lower value, plus a receivable
  // with the difference.
  for (const exp of dbCredit) {
    if (usedDb.has(exp.id)) continue;
    if (exp.card_name !== card) continue;
    if (Number(exp.total_parcels) !== parcels) continue;
    const need = amount - Number(exp.parcel_value);
    if (need <= 0) continue;
    const recv = dbRecv.find(
      (r) =>
        !usedRecv.has(r.id) &&
        r.card_name === card &&
        Number(r.total_parcels) === parcels &&
        Math.abs(Number(r.parcel_value) - need) < 0.05,
    );
    if (recv) {
      usedDb.add(exp.id);
      usedRecv.add(recv.id);
      return { exp, recv };
    }
  }
  // Pure receivable (the entire charge is being reimbursed).
  const pureRecv = dbRecv.find(
    (r) =>
      !usedRecv.has(r.id) &&
      r.card_name === card &&
      Number(r.total_parcels) === parcels &&
      Math.abs(Number(r.parcel_value) - amount) < 0.1,
  );
  if (pureRecv) {
    usedRecv.add(pureRecv.id);
    return { recv: pureRecv };
  }
  return null;
}

function verify(card, fatura) {
  console.log(`\n══════ ${card} ══════`);
  let total = 0;
  const missing = [];
  const matched = [];
  for (const line of fatura) {
    total += line.amount;
    // Try fixed_expenses first for singles (subscriptions like Spotify
    // that wouldn't be in credit_expenses).
    const fixed = line.parcels === 1 ? findFixedMatch(card, line.amount) : null;
    if (fixed) {
      matched.push({ line, db: fixed, kind: "fixed" });
      continue;
    }
    const credit = findCreditMatch(card, line.parcels, line.amount, line.date);
    if (credit) {
      matched.push({ line, db: credit, kind: "credit" });
      continue;
    }
    // Last resort: maybe this is a receivable (or expense+receivable
    // pair) totaling the fatura value.
    const recv = findReceivableMatch(card, line.parcels, line.amount);
    if (recv) {
      matched.push({ line, db: recv, kind: "receivable" });
      continue;
    }
    missing.push(line);
  }
  console.log(`fatura total: R$ ${fmt(total)}`);
  console.log(`matched:      ${matched.length}/${fatura.length}`);
  console.log(`missing:      ${missing.length}`);

  if (matched.length) {
    console.log("\n— matched —");
    for (const { line, db, kind } of matched) {
      let tag;
      let label;
      if (kind === "fixed") {
        tag = "[fixed]";
        label = `"${db.description}"`;
      } else if (kind === "credit") {
        tag = `[credit ${db.purchase_date}]`;
        label = `"${db.description}"`;
      } else {
        // receivable
        if (db.exp && db.recv) {
          tag = "[expense + receivable]";
          label = `"${db.exp.description}" (R$ ${fmt(db.exp.parcel_value)}) + "${db.recv.description}" (R$ ${fmt(db.recv.parcel_value)})`;
        } else {
          tag = "[receivable only]";
          label = `"${db.recv.description}"`;
        }
      }
      console.log(
        `  ✓ ${line.desc} | ${line.parcels}× ${fmt(line.amount)}\n      → ${tag} ${label}`,
      );
    }
  }
  if (missing.length) {
    console.log("\n— MISSING from DB (charged on fatura, no matching row) —");
    for (const m of missing) {
      console.log(
        `  ✗ ${m.desc} | ${m.date} | ${m.parcels}× R$ ${fmt(m.amount)} (total R$ ${fmt(m.amount * m.parcels)})`,
      );
    }
  }
}

verify("Banco do Brasil", BB_FATURA);
verify("Nubank", NUBANK_FATURA);

// Now find DB rows whose parcels would fall in this fatura but didn't
// appear on either statement (i.e., DB has it but bank doesn't).
console.log(
  "\n══════ DB credit rows with a parcel in April 2026 that aren't on either fatura ══════",
);

// `usedDb` already accumulated all matched ids during verify().
const matchedIds = usedDb;

// Heuristic: for a DB row to have a parcel in April 2026 fatura, the
// purchase_date should be roughly: (April 2026 - parcel offset) months
// ago. We approximate by checking purchase_date is within total_parcels
// months back from end of April 2026.
const endApril = new Date(Date.UTC(2026, 4, 1)); // start of May
function monthsBack(iso) {
  const [y, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1, 1));
  return (endApril - d) / (1000 * 60 * 60 * 24 * 30.44);
}

for (const r of dbCredit) {
  if (matchedIds.has(r.id)) continue;
  if (r.card_name !== "Nubank" && r.card_name !== "Banco do Brasil") continue;
  // Only flag rows that might've had a parcel in this fatura.
  const months = monthsBack(r.purchase_date);
  if (months >= 0 && months <= Number(r.total_parcels) + 1) {
    console.log(
      `  ? ${r.card_name} | ${r.description} | ${r.purchase_date} | ${r.total_parcels}× R$ ${fmt(r.parcel_value)}`,
    );
  }
}

console.log("\nDone — read-only.");

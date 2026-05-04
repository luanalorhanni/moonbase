// Read-only diff between Luana's receivables spreadsheet and the DB.
// Mirrors the credit-expenses diff: matches by (card, date, amount,
// parcels), with an off-by-one date fallback for the timezone import bug.

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const USER_ID = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";

// Tab-separated rows pasted from the spreadsheet.
const SPREADSHEET = `\
Passagem Curitiba\tNubank\tR$ 533,26\t03/11/2025\t4\tdezembro 2025\tmarço 2026
Passagem Livs\tBanco do Brasil\tR$ 73,80\t28/09/2025\t5\tnovembro 2025\tmarço 2026
Passagens Volta Foz\tBanco do Brasil\tR$ 417,51\t28/12/2025\t6\tfevereiro 2026\tjulho 2026
Passeios Foz\tNubank\tR$ 100,00\t10/12/2025\t10\tjaneiro 2026\toutubro 2026
Seguro Cirurgia Mamãe\tNubank\tR$ 119,91\t21/11/2025\t5\tdezembro 2025\tabril 2026
Uber Curitiba\tNubank\tR$ 26,77\t03/02/2026\t1\tmarço 2026\tmarço 2026
Uber Curitiba Jardim\tNubank\tR$ 7,88\t03/02/2026\t1\tmarço 2026\tmarço 2026
Uber Curitiba Aeroporto\tNubank\tR$ 70,85\t03/02/2026\t1\tmarço 2026\tmarço 2026
Uber Curitiba Aeroporto\tNubank\tR$ 37,30\t04/02/2026\t1\tmarço 2026\tmarço 2026
Uber Foz Sorelle\tNubank\tR$ 5,78\t04/02/2026\t1\tmarço 2026\tmarço 2026
Uber Foz Sorelle\tNubank\tR$ 11,22\t04/02/2026\t1\tmarço 2026\tmarço 2026
Uber AquaFoz\tNubank\tR$ 35,91\t05/02/2026\t1\tmarço 2026\tmarço 2026
Uber MovieCars\tNubank\tR$ 20,35\t07/02/2026\t1\tmarço 2026\tmarço 2026
Fotos IceBar\tNubank\tR$ 50,00\t07/02/2026\t4\tmarço 2026\tjunho 2026
Mounjaro Mamãe\tBanco do Brasil\tR$ 102,62\t06/02/2026\t12\tmarço 2026\tfevereiro 2027
Uber Ida BlackBill\tNubank\tR$ 17,13\t08/02/2026\t1\tmarço 2026\tmarço 2026
Uber Volta BlackBill\tNubank\tR$ 7,15\t08/02/2026\t1\tmarço 2026\tmarço 2026
Uber Roda Gigante para Marco\tNubank\tR$ 8,81\t10/02/2026\t1\tmarço 2026\tmarço 2026
Uber Aeroporto Foz\tNubank\tR$ 52,23\t12/02/2026\t1\tmarço 2026\tmarço 2026
Congresso Mamãe\tBanco do Brasil\tR$ 96,00\t30/03/2026\t6\tmaio 2026\toutubro 2026`;

function parseBRL(s) {
  return Number(s.replace(/[Rr]\$\s*/g, "").replace(/ /g, "").trim().replace(/\./g, "").replace(",", "."));
}
function parseDate(s) {
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
function fmtBRL(n) {
  return Number(n).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

const csv = SPREADSHEET.split("\n").map((line) => {
  const [description, card, amount, date, parcels] = line.split("\t");
  return {
    description: description.trim(),
    card: card.trim(),
    amount: parseBRL(amount),
    date: parseDate(date),
    parcels: Number(parcels.trim()),
  };
});

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const dbRows = await sql`
  SELECT r.id, r.description, r.purchase_date, r.total_parcels, r.parcel_value, c.name AS card_name
  FROM credit_receivables r
  JOIN cards c ON c.id = r.card_id
  WHERE r.user_id = ${USER_ID}
`;

await sql.end();

console.log(`spreadsheet rows: ${csv.length}`);
console.log(`db rows:          ${dbRows.length}`);

const csvMap = new Map();
for (const r of csv) {
  pushKey(csvMap, `${norm(r.card)}|${r.date}|${r.amount.toFixed(2)}|${r.parcels}`, r);
}
const dbMap = new Map();
for (const r of dbRows) {
  pushKey(
    dbMap,
    `${norm(r.card_name)}|${isoDateOf(r.purchase_date)}|${Number(r.parcel_value).toFixed(2)}|${r.total_parcels}`,
    { ...r, purchase_date: isoDateOf(r.purchase_date) },
  );
}

const onlyInCsv = [];
const onlyInDb = [];
const offByOne = [];
const descDiffs = [];

const used = new Set();
for (const [key, csvList] of csvMap) {
  const dbList = (dbMap.get(key) ?? []).filter((d) => !used.has(d.id));
  const matched = Math.min(csvList.length, dbList.length);
  for (let i = 0; i < matched; i++) {
    used.add(dbList[i].id);
    if (norm(dbList[i].description) !== norm(csvList[i].description)) {
      descDiffs.push({ csv: csvList[i], db: dbList[i], exact: true });
    }
  }
  for (let i = matched; i < csvList.length; i++) {
    const c = csvList[i];
    const altKey = `${norm(c.card)}|${shiftIso(c.date, -1)}|${c.amount.toFixed(2)}|${c.parcels}`;
    const alt = (dbMap.get(altKey) ?? []).filter((d) => !used.has(d.id));
    if (alt.length > 0) {
      const db = alt[0];
      used.add(db.id);
      offByOne.push({ csv: c, db });
      if (norm(db.description) !== norm(c.description)) {
        descDiffs.push({ csv: c, db, exact: false });
      }
    } else {
      onlyInCsv.push(c);
    }
  }
}
for (const r of dbRows) if (!used.has(r.id)) onlyInDb.push({ ...r, purchase_date: isoDateOf(r.purchase_date) });

console.log(`\nOff-by-one date:   ${offByOne.length}  (DB date is 1 day earlier than spreadsheet)`);
console.log(`Description diffs: ${descDiffs.length}`);
console.log(`Only in spreadsheet: ${onlyInCsv.length}`);
console.log(`Only in DB:          ${onlyInDb.length}`);

if (offByOne.length) {
  console.log("\n— off-by-one rows —");
  for (const { csv, db } of offByOne) {
    console.log(`  · ${csv.card} | ${csv.description} | csv=${csv.date} db=${db.purchase_date} | ${csv.parcels}× ${fmtBRL(csv.amount)}`);
  }
}
if (descDiffs.length) {
  console.log("\n— description diffs —");
  for (const { csv, db } of descDiffs) {
    console.log(`  · ${csv.card} | ${csv.date} | ${fmtBRL(csv.amount)}\n      db: "${db.description}"\n     csv: "${csv.description}"`);
  }
}
if (onlyInCsv.length) {
  console.log("\n— only in spreadsheet —");
  for (const r of onlyInCsv) {
    console.log(`  · ${r.card} | ${r.description} | ${r.date} | ${r.parcels}× ${fmtBRL(r.amount)}`);
  }
}
if (onlyInDb.length) {
  console.log("\n— only in DB —");
  for (const r of onlyInDb) {
    console.log(`  · ${r.card_name} | ${r.description} | ${r.purchase_date} | ${r.total_parcels}× ${fmtBRL(r.parcel_value)}`);
  }
}

console.log("\nDone — read-only.");

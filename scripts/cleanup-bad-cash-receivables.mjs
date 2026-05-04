/**
 * One-shot cleanup: a batch of february-bill credit purchases were created
 * as cash receivables with amount R$ 0.00 and bogus epoch dates. The user
 * pasted the canonical credit-receivable data; this script recreates each
 * as a credit receivable (if missing) and deletes the broken cash row.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/cleanup-bad-cash-receivables.mjs
 */
import postgres from "postgres";

const ENTRIES = [
  {
    description: "Passagem Curitiba",
    card: "Nubank",
    amount: "533.26",
    purchaseDate: "2025-11-03",
    totalParcels: 4,
    firstMonth: "2025-12",
    lastMonth: "2026-03",
  },
  {
    description: "Passagem Livs",
    card: "Banco do Brasil",
    amount: "73.80",
    purchaseDate: "2025-09-28",
    totalParcels: 5,
    firstMonth: "2025-11",
    lastMonth: "2026-03",
  },
  {
    description: "Passagens Volta Foz",
    card: "Banco do Brasil",
    amount: "417.51",
    purchaseDate: "2025-12-28",
    totalParcels: 6,
    firstMonth: "2026-02",
    lastMonth: "2026-07",
  },
  {
    description: "Passeios Foz",
    card: "Nubank",
    amount: "100.00",
    purchaseDate: "2025-12-10",
    totalParcels: 10,
    firstMonth: "2026-01",
    lastMonth: "2026-10",
  },
  {
    description: "Seguro Cirurgia Mamãe",
    card: "Nubank",
    amount: "119.91",
    purchaseDate: "2025-11-21",
    totalParcels: 5,
    firstMonth: "2025-12",
    lastMonth: "2026-04",
  },
  {
    description: "Uber Curitiba",
    card: "Nubank",
    amount: "26.77",
    purchaseDate: "2026-02-03",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Curitiba Jardim",
    card: "Nubank",
    amount: "7.88",
    purchaseDate: "2026-02-03",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Curitiba Aeroporto",
    card: "Nubank",
    amount: "70.85",
    purchaseDate: "2026-02-03",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Curitiba Aeroporto",
    card: "Nubank",
    amount: "37.30",
    purchaseDate: "2026-02-04",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Foz Sorelle",
    card: "Nubank",
    amount: "5.78",
    purchaseDate: "2026-02-04",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Foz Sorelle",
    card: "Nubank",
    amount: "11.22",
    purchaseDate: "2026-02-04",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber AquaFoz",
    card: "Nubank",
    amount: "35.91",
    purchaseDate: "2026-02-05",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber MovieCars",
    card: "Nubank",
    amount: "20.35",
    purchaseDate: "2026-02-07",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Fotos IceBar",
    card: "Nubank",
    amount: "50.00",
    purchaseDate: "2026-02-07",
    totalParcels: 4,
    firstMonth: "2026-03",
    lastMonth: "2026-06",
  },
  {
    description: "Mounjaro Mamãe",
    card: "Banco do Brasil",
    amount: "102.62",
    purchaseDate: "2026-02-06",
    totalParcels: 12,
    firstMonth: "2026-03",
    lastMonth: "2027-02",
  },
  {
    description: "Uber Ida BlackBill",
    card: "Nubank",
    amount: "17.13",
    purchaseDate: "2026-02-08",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Volta BlackBill",
    card: "Nubank",
    amount: "7.15",
    purchaseDate: "2026-02-08",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Roda Gigante para Marco",
    card: "Nubank",
    amount: "8.81",
    purchaseDate: "2026-02-10",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Uber Aeroporto Foz",
    card: "Nubank",
    amount: "52.23",
    purchaseDate: "2026-02-12",
    totalParcels: 1,
    firstMonth: "2026-03",
    lastMonth: "2026-03",
  },
  {
    description: "Congresso Mamãe",
    card: "Banco do Brasil",
    amount: "96.00",
    purchaseDate: "2026-03-30",
    totalParcels: 6,
    firstMonth: "2026-05",
    lastMonth: "2026-10",
  },
];

const DESCRIPTIONS = Array.from(new Set(ENTRIES.map((e) => e.description)));

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

function firstDay(yyyymm) {
  return `${yyyymm}-01`;
}

try {
  // Single-user app — pick the only user_id from cards.
  const [{ user_id: userId }] = await sql`SELECT user_id FROM cards LIMIT 1`;
  console.log(`user: ${userId}`);

  // Resolve card names → ids.
  const cards = await sql`
    SELECT id, name, default_closing_day
    FROM cards
    WHERE user_id = ${userId} AND name IN ('Nubank', 'Banco do Brasil')
  `;
  const cardByName = new Map(cards.map((c) => [c.name, c]));
  console.log(`cards loaded: ${[...cardByName.keys()].join(", ")}`);

  // Existing credit receivables matching these descriptions+amounts.
  const existingCredit = await sql`
    SELECT description, parcel_value
    FROM credit_receivables
    WHERE user_id = ${userId} AND description = ANY(${DESCRIPTIONS})
  `;
  const existingKey = new Set(
    existingCredit.map((r) => `${r.description}|${Number(r.parcel_value).toFixed(2)}`),
  );
  console.log(`existing credit matches: ${existingCredit.length}`);

  let created = 0;
  let skipped = 0;
  for (const e of ENTRIES) {
    const key = `${e.description}|${Number(e.amount).toFixed(2)}`;
    if (existingKey.has(key)) {
      skipped += 1;
      continue;
    }
    const card = cardByName.get(e.card);
    if (!card) {
      console.warn(`! card not found for "${e.description}": ${e.card}`);
      continue;
    }
    await sql`
      INSERT INTO credit_receivables (
        user_id, description, card_id, purchase_date, total_parcels,
        parcel_value, first_parcel_date, last_parcel_date,
        first_parcel_month, last_parcel_month, manual_override
      ) VALUES (
        ${userId}, ${e.description}, ${card.id}, ${e.purchaseDate}, ${e.totalParcels},
        ${e.amount}, ${firstDay(e.firstMonth)}, ${firstDay(e.lastMonth)},
        ${firstDay(e.firstMonth)}, ${firstDay(e.lastMonth)}, true
      )
    `;
    created += 1;
  }
  console.log(`credit receivables — created: ${created}, skipped (already existed): ${skipped}`);

  // Delete the broken cash receivables: descriptions in the list AND amount = 0.
  const deleted = await sql`
    DELETE FROM cash_receivables
    WHERE user_id = ${userId}
      AND description = ANY(${DESCRIPTIONS})
      AND amount::numeric = 0
    RETURNING description
  `;
  console.log(`cash receivables deleted: ${deleted.length}`);
  for (const row of deleted) {
    console.log(`  - ${row.description}`);
  }

  console.log("✓ done");
} catch (err) {
  console.error(`✗ failed: ${err.message}`);
  process.exit(1);
} finally {
  await sql.end();
}

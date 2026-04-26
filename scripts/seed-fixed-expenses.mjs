import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";
import { randomUUID } from "node:crypto";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const userId = process.env.MOONBASE_USER_ID;

const ROWS = [
  {
    card: "Inter",
    desc: "Fatura MEI",
    sub: "DAS MEI",
    cat: "Essentials",
    method: "cash",
    amount: "87.05",
  },
  {
    card: "Inter",
    desc: "Fatura Claro",
    sub: "Phone Company",
    cat: "Essentials",
    method: "cash",
    amount: "40.00",
  },
  {
    card: "Banco do Brasil",
    desc: "Academia",
    sub: "Gym",
    cat: "Health",
    method: "credit",
    amount: "108.39",
  },
  {
    card: "Nubank",
    desc: "Spotify",
    sub: "Tools",
    cat: "Subscriptions",
    method: "credit",
    amount: "40.90",
  },
  {
    card: "Nubank",
    desc: "Canva",
    sub: "Tools",
    cat: "Subscriptions",
    method: "credit",
    amount: "35.00",
  },
  {
    card: "Nubank",
    desc: "Google One",
    sub: "Tools",
    cat: "Subscriptions",
    method: "credit",
    amount: "14.99",
  },
  {
    card: "Banco do Brasil",
    desc: "Ifood Club",
    sub: "Tools",
    cat: "Subscriptions",
    method: "credit",
    amount: "7.95",
  },
];

const COLORS = ["blue", "purple", "green", "pink", "orange", "yellow", "brown", "gray"];

const cards = await sql`SELECT id, name FROM cards WHERE user_id = ${userId}`;
const cardId = (name) => cards.find((c) => c.name.toLowerCase() === name.toLowerCase())?.id;

const cats = await sql`SELECT id, name FROM categories WHERE user_id = ${userId}`;
const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
const subs = await sql`SELECT id, name, category_id FROM subcategories WHERE user_id = ${userId}`;
const subByPair = new Map(subs.map((s) => [`${s.category_id}::${s.name.toLowerCase()}`, s.id]));

let createdCats = 0;
let createdSubs = 0;

async function ensureCategory(name) {
  const existing = catByName.get(name.toLowerCase());
  if (existing) return existing;
  const id = randomUUID();
  await sql`INSERT INTO categories (id, user_id, name, color)
            VALUES (${id}, ${userId}, ${name}, ${COLORS[catByName.size % COLORS.length]})`;
  catByName.set(name.toLowerCase(), id);
  createdCats++;
  return id;
}

async function ensureSubcategory(name, categoryId) {
  const key = `${categoryId}::${name.toLowerCase()}`;
  const existing = subByPair.get(key);
  if (existing) return existing;
  const id = randomUUID();
  await sql`INSERT INTO subcategories (id, user_id, name, category_id)
            VALUES (${id}, ${userId}, ${name}, ${categoryId})`;
  subByPair.set(key, id);
  createdSubs++;
  return id;
}

let inserted = 0;
const today = new Date().toISOString().slice(0, 10);

for (const r of ROWS) {
  const cId = cardId(r.card);
  if (!cId) {
    console.log(`⚠ skipped (card not found): ${r.card} — ${r.desc}`);
    continue;
  }
  const catId = await ensureCategory(r.cat);
  const subId = await ensureSubcategory(r.sub, catId);
  await sql`
    INSERT INTO fixed_expenses (
      id, user_id, description, card_id, subcategory_id, payment_method,
      monthly_amount, start_date, is_active
    ) VALUES (
      ${randomUUID()}, ${userId}, ${r.desc}, ${cId}, ${subId}, ${r.method},
      ${r.amount}, ${today}, true
    )
  `;
  inserted++;
}

console.log(`\n✓ ${inserted} fixed expenses inserted`);
console.log(`  ${createdCats} new categories, ${createdSubs} new subcategories`);

await sql.end();

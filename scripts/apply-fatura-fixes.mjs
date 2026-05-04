// Apply the 5 divergences identified by verify-faturas.mjs against the
// Nubank fatura (BB had only the estornado Uber, which is net zero).

import { config } from "dotenv";
import postgres from "postgres";

config({ path: ".env.local" });

const USER = "3827dc6f-2b5b-4590-a7a6-4f5f8506f36b";
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });

const cards = await sql`SELECT id, name FROM cards WHERE user_id = ${USER}`;
const nubank = cards.find((c) => c.name === "Nubank")?.id;
if (!nubank) throw new Error("Nubank card not found");

const subs = await sql`
  SELECT sub.id, sub.name AS sub_name, cat.name AS cat_name
  FROM subcategories sub JOIN categories cat ON cat.id = sub.category_id
  WHERE sub.user_id = ${USER}
`;
function findSub(s, c) {
  const r = subs.find(
    (x) =>
      x.sub_name.toLowerCase() === s.toLowerCase() && x.cat_name.toLowerCase() === c.toLowerCase(),
  );
  if (!r) throw new Error(`subcategory not found: ${s}/${c}`);
  return r.id;
}

console.log("\n══ updating credit_expenses ══");

// 1. Picolé Frosty: amount 34.43 → 35.43
{
  const r = await sql`
    UPDATE credit_expenses
    SET parcel_value = '35.43'
    WHERE user_id = ${USER}
      AND card_id = ${nubank}
      AND description = 'Picolé Frosty'
      AND parcel_value = '34.43'
      AND total_parcels = 1
    RETURNING id
  `;
  console.log(`✓ Picolé Frosty: R$ 34,43 → R$ 35,43 (${r.length} row updated)`);
}

// 2. Jogos na Steam: 1× 29.38 → 2× 29.37
//    The DB has multiple "Jogos na Steam" rows; pick the one at 29.38.
{
  const r = await sql`
    UPDATE credit_expenses
    SET parcel_value = '29.37', total_parcels = 2
    WHERE user_id = ${USER}
      AND card_id = ${nubank}
      AND description = 'Jogos na Steam'
      AND parcel_value = '29.38'
      AND total_parcels = 1
    RETURNING id
  `;
  console.log(`✓ Jogos na Steam: 1× R$ 29,38 → 2× R$ 29,37 (${r.length} row updated)`);
}

// 3. Uber p/ Rota 4: amount 6.89 → 6.96, date 2026-04-03 → 2026-04-04
{
  const r = await sql`
    UPDATE credit_expenses
    SET parcel_value = '6.96', purchase_date = '2026-04-04'
    WHERE user_id = ${USER}
      AND card_id = ${nubank}
      AND description = 'Uber p/ Rota 4'
      AND parcel_value = '6.89'
      AND purchase_date = '2026-04-03'
    RETURNING id
  `;
  console.log(`✓ Uber p/ Rota 4: R$ 6,89 (03/04) → R$ 6,96 (04/04) (${r.length} row updated)`);
}

console.log("\n══ inserting missing credit_expenses ══");

// 4. Uber R$ 4.08 on 2026-04-25
{
  const subId = findSub("Uber", "Transport");
  const r = await sql`
    INSERT INTO credit_expenses (
      user_id, description, card_id, subcategory_id, purchase_date,
      total_parcels, parcel_value
    ) VALUES (
      ${USER}, 'Uber', ${nubank}, ${subId}, '2026-04-25', 1, '4.08'
    )
    RETURNING id
  `;
  console.log(`✓ inserted Uber R$ 4,08 (25/04) — Transport/Uber (id ${r[0].id})`);
}

// 5. Steam P1/2 R$ 9.00 on 2026-04-20, 2 parcels
{
  const subId = findSub("Games", "Entertainment");
  const r = await sql`
    INSERT INTO credit_expenses (
      user_id, description, card_id, subcategory_id, purchase_date,
      total_parcels, parcel_value
    ) VALUES (
      ${USER}, 'Jogo na Steam (parcelado)', ${nubank}, ${subId}, '2026-04-20', 2, '9.00'
    )
    RETURNING id
  `;
  console.log(`✓ inserted Steam 2× R$ 9,00 (20/04) — Entertainment/Games (id ${r[0].id})`);
}

console.log("\n══ done ══");

await sql.end();

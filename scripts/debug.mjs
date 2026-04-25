import { config } from "dotenv";
config({ path: ".env.local" });

import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });
const userId = process.env.MOONBASE_USER_ID;

const total = await sql`SELECT count(*)::int as n FROM credit_expenses WHERE user_id = ${userId}`;
const nullDates = await sql`
  SELECT count(*)::int as n FROM credit_expenses
  WHERE user_id = ${userId}
    AND (first_parcel_month IS NULL OR last_parcel_month IS NULL)
`;
const aprilParcels = await sql`
  SELECT count(*)::int as n FROM credit_expenses
  WHERE user_id = ${userId}
    AND first_parcel_month <= '2026-04-01'
    AND last_parcel_month >= '2026-04-01'
`;
const maioParcels = await sql`
  SELECT count(*)::int as n FROM credit_expenses
  WHERE user_id = ${userId}
    AND first_parcel_month <= '2026-05-01'
    AND last_parcel_month >= '2026-05-01'
`;

console.log(`total credit_expenses: ${total[0].n}`);
console.log(`null parcel months:    ${nullDates[0].n}`);
console.log(`active in April 2026:  ${aprilParcels[0].n}`);
console.log(`active in May 2026:    ${maioParcels[0].n}`);

const aprSum = await sql`
  SELECT sum(parcel_value::numeric)::numeric(12,2) as t
  FROM credit_expenses
  WHERE user_id = ${userId}
    AND first_parcel_month <= '2026-04-01'
    AND last_parcel_month >= '2026-04-01'
`;
console.log(`\nApril 2026 credit total: R$ ${aprSum[0].t}`);

await sql.end();

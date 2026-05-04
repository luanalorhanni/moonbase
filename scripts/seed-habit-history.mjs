/**
 * One-shot import: 49 days of habit history for read / watering / english,
 * window 2026-03-16 (Mon) → 2026-05-03 (Sun).
 *
 * Idempotent: relies on the habit_logs unique (habit_id, date) constraint
 * and ON CONFLICT DO NOTHING, so running twice is safe.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/seed-habit-history.mjs
 */
import postgres from "postgres";

// Per-habit list of dates the user marked as completed.
// Source: chat history dump from the user, week by week.
const HABIT_LOGS = {
  read: [
    // Week 1 — Mar 16-22 (all 7)
    "2026-03-16",
    "2026-03-17",
    "2026-03-18",
    "2026-03-19",
    "2026-03-20",
    "2026-03-21",
    "2026-03-22",
    // Week 2 — Mar 23-29 (5/7, skip 28,29)
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    // Week 3 — Mar 30 - Apr 5 (all 7)
    "2026-03-30",
    "2026-03-31",
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
    "2026-04-04",
    "2026-04-05",
    // Week 4 — Apr 6-12 (5/7, skip 09,10)
    "2026-04-06",
    "2026-04-07",
    "2026-04-08",
    "2026-04-11",
    "2026-04-12",
    // Week 5 — Apr 13-19 (4/7, skip 17,18,19)
    "2026-04-13",
    "2026-04-14",
    "2026-04-15",
    "2026-04-16",
    // Week 6 — Apr 20-26 (5/7, skip 21,24)
    "2026-04-20",
    "2026-04-22",
    "2026-04-23",
    "2026-04-25",
    "2026-04-26",
    // Week 7 — Apr 27 - May 3 (0/7)
  ],
  "watering the plants": [
    // Week 1 (all 7)
    "2026-03-16",
    "2026-03-17",
    "2026-03-18",
    "2026-03-19",
    "2026-03-20",
    "2026-03-21",
    "2026-03-22",
    // Week 2 (5/7, skip 28,29)
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    // Week 3 (all 7)
    "2026-03-30",
    "2026-03-31",
    "2026-04-01",
    "2026-04-02",
    "2026-04-03",
    "2026-04-04",
    "2026-04-05",
    // Week 4 (all 7)
    "2026-04-06",
    "2026-04-07",
    "2026-04-08",
    "2026-04-09",
    "2026-04-10",
    "2026-04-11",
    "2026-04-12",
    // Week 5 (4/7, skip 13,15,18)
    "2026-04-14",
    "2026-04-16",
    "2026-04-17",
    "2026-04-19",
    // Week 6 (all 7)
    "2026-04-20",
    "2026-04-21",
    "2026-04-22",
    "2026-04-23",
    "2026-04-24",
    "2026-04-25",
    "2026-04-26",
    // Week 7 (1/7, only 27)
    "2026-04-27",
  ],
  "english practice": [
    // Week 1 (4/7: 16,17,18,22)
    "2026-03-16",
    "2026-03-17",
    "2026-03-18",
    "2026-03-22",
    // Week 2 (5/7: 23-27, skip 28,29)
    "2026-03-23",
    "2026-03-24",
    "2026-03-25",
    "2026-03-26",
    "2026-03-27",
    // Week 3 (5/7: skip 30 and 03)
    "2026-03-31",
    "2026-04-01",
    "2026-04-02",
    "2026-04-04",
    "2026-04-05",
    // Week 4 (4/7: 06, 08, 10, 12)
    "2026-04-06",
    "2026-04-08",
    "2026-04-10",
    "2026-04-12",
    // Week 5 (5/7: 13-16, skip 17,18, then 19)
    "2026-04-13",
    "2026-04-14",
    "2026-04-15",
    "2026-04-16",
    "2026-04-19",
    // Week 6 (6/7: skip 21)
    "2026-04-20",
    "2026-04-22",
    "2026-04-23",
    "2026-04-24",
    "2026-04-25",
    "2026-04-26",
    // Week 7 (0/7)
  ],
};

const sql = postgres(process.env.DATABASE_URL, { max: 1, prepare: false });

try {
  const habitNames = Object.keys(HABIT_LOGS);
  const habits = await sql`
    SELECT id, user_id, name FROM habits WHERE name = ANY(${habitNames})
  `;

  // Index by name and confirm we found every one.
  const byName = new Map(habits.map((h) => [h.name, h]));
  for (const name of habitNames) {
    if (!byName.has(name)) {
      console.error(`✗ habit not found: "${name}"`);
      process.exit(1);
    }
  }

  let totalInserted = 0;
  for (const [name, dates] of Object.entries(HABIT_LOGS)) {
    const habit = byName.get(name);
    const rows = dates.map((date) => ({
      user_id: habit.user_id,
      habit_id: habit.id,
      date,
    }));
    const inserted = await sql`
      INSERT INTO habit_logs ${sql(rows, "user_id", "habit_id", "date")}
      ON CONFLICT (habit_id, date) DO NOTHING
      RETURNING id
    `;
    console.log(`  ${name}: ${inserted.length}/${rows.length} inserted (rest already existed)`);
    totalInserted += inserted.length;
  }
  console.log(`✓ done — ${totalInserted} new logs across ${habitNames.length} habits`);
} catch (err) {
  console.error(`✗ failed: ${err.message}`);
  process.exit(1);
} finally {
  await sql.end();
}

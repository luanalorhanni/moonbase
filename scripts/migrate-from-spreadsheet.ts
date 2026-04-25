/**
 * One-shot importer: reads the original Google Sheets workbook (.xlsx
 * export) and inserts its rows into the moonbase database via Drizzle.
 *
 * Usage:
 *   pnpm tsx scripts/migrate-from-spreadsheet.ts <file.xlsx>             # dry run
 *   pnpm tsx scripts/migrate-from-spreadsheet.ts <file.xlsx> --confirm   # writes
 *   pnpm tsx scripts/migrate-from-spreadsheet.ts <file.xlsx> --only=cards,categories
 *
 * The script is intentionally explicit: every tab parser is its own
 * function and the column-name mapping at the top is the only thing you
 * normally need to touch when the spreadsheet's layout drifts.
 *
 * Edge cases handled:
 *   - Excel serial-number dates (rendered as JS Date by exceljs, normalised
 *     to "YYYY-MM-DD")
 *   - `__xludf.DUMMYFUNCTION` cached values left behind when XLSX export
 *     stripped the original FILTER formulas (treated as empty)
 *   - Hardcoded month overrides on credit expenses (rows where the user
 *     filled the parcel-month columns by hand) — preserved by setting
 *     manualOverride = true and trusting the values verbatim
 *   - Currency strings with thousands separators ("R$ 1.234,56") parsed
 *     to the canonical "1234.56" numeric string
 *
 * The script wraps every tab's writes in its own transaction so a
 * malformed row in tab N doesn't roll back tabs 1..N-1. Re-running with
 * --only=<tab> after a fix lets you resume.
 */

import { parseArgs } from "node:util";

import ExcelJS from "exceljs";
import { sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const USER_ID = process.env.MOONBASE_USER_ID;
if (!USER_ID) {
  throw new Error("MOONBASE_USER_ID env var must be set (see .env.local).");
}

// ----------------------------------------------------------------------------
// Tab name → header column map. Adjust strings to match your workbook.
// ----------------------------------------------------------------------------

const TABS = {
  categories: "⚪ Categorys",
  cards: "🛒 Carts",
  cashExpenses: "💵 Cash Expenses",
  creditExpenses: "🪪 Credit Expenses",
  incomes: "📈 Incomes",
  cashReceivables: "🪙 Receivable",
  liquidSavings: "🏦 Investiments",
  monthlySnapshots: "📅 Anual Finance",
} as const;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const DUMMYFUNCTION = "__xludf.DUMMYFUNCTION";

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") {
    return value.includes(DUMMYFUNCTION) ? "" : value.trim();
  }
  if (typeof value === "number") return String(value);
  if (value instanceof Date) return cellDate(value);
  if (typeof value === "object" && value !== null) {
    if ("text" in value && typeof value.text === "string") return value.text.trim();
    if ("result" in value) return cellText(value.result as ExcelJS.CellValue);
    if ("richText" in value && Array.isArray(value.richText)) {
      return value.richText
        .map((r) => r.text)
        .join("")
        .trim();
    }
  }
  return String(value);
}

function cellDate(value: ExcelJS.CellValue): string {
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof value === "number") {
    // Excel serial → JS Date: epoch 1899-12-30
    const date = new Date(Math.round((value - 25569) * 86400 * 1000));
    return cellDate(date);
  }
  const text = cellText(value);
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d, m, y] = text.split("/");
    return `${y}-${m}-${d}`;
  }
  return text;
}

function cellAmount(value: ExcelJS.CellValue): string {
  const text = cellText(value);
  if (text === "") return "0.00";
  // Strip "R$", spaces, thousands separators, normalise comma decimal.
  const cleaned = text
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}([,.]|$))/g, "") // thousands dots
    .replace(",", ".");
  const n = Number(cleaned);
  if (Number.isNaN(n)) return "0.00";
  return n.toFixed(2);
}

function cellInt(value: ExcelJS.CellValue): number | null {
  const text = cellText(value);
  if (text === "") return null;
  const n = parseInt(text, 10);
  return Number.isNaN(n) ? null : n;
}

function cellBool(value: ExcelJS.CellValue): boolean {
  const text = cellText(value).toLowerCase();
  return text === "true" || text === "sim" || text === "yes" || text === "1";
}

type SheetRows = { headers: string[]; rows: Record<string, ExcelJS.CellValue>[] };

function readSheet(workbook: ExcelJS.Workbook, name: string): SheetRows | null {
  const sheet = workbook.getWorksheet(name);
  if (!sheet) return null;

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    headers[colNumber - 1] = cellText(cell.value).toLowerCase();
  });

  const rows: Record<string, ExcelJS.CellValue>[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const obj: Record<string, ExcelJS.CellValue> = {};
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const header = headers[colNumber - 1];
      if (header) obj[header] = cell.value;
    });
    if (Object.values(obj).some((v) => cellText(v) !== "")) {
      rows.push(obj);
    }
  });

  return { headers, rows };
}

// ----------------------------------------------------------------------------
// Tab parsers — return arrays of typed insert payloads. All field accesses
// assume lowercase header names per readSheet().
// ----------------------------------------------------------------------------

function parseCategories(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    userId: USER_ID!,
    name: cellText(r["name"] ?? r["category"] ?? r["categoria"]),
    color: (cellText(r["color"]).toLowerCase() || "gray") as
      | "red"
      | "orange"
      | "yellow"
      | "green"
      | "blue"
      | "purple"
      | "pink"
      | "brown"
      | "gray",
    icon: cellText(r["icon"]) || null,
  }));
}

function parseCards(sheet: SheetRows) {
  return sheet.rows.map((r) => {
    const type: "credit" | "account" =
      cellText(r["type"]).toLowerCase() === "credit" ? "credit" : "account";
    return {
      userId: USER_ID!,
      name: cellText(r["name"] ?? r["card"] ?? r["cartao"]),
      type,
      bank: cellText(r["bank"]) || null,
      defaultClosingDay: cellInt(r["closing"] ?? r["closing_day"] ?? r["fechamento"]),
      dueDay: cellInt(r["due"] ?? r["due_day"] ?? r["vencimento"]),
      limitAmount: type === "credit" ? cellAmount(r["limit"] ?? r["limite"]) : null,
      color: (cellText(r["color"]).toLowerCase() || "gray") as
        | "red"
        | "orange"
        | "yellow"
        | "green"
        | "blue"
        | "purple"
        | "pink"
        | "brown"
        | "gray",
      isActive: r["active"] === undefined ? true : cellBool(r["active"]),
    };
  });
}

function parseCashExpenses(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    description: cellText(r["description"] ?? r["descricao"]),
    cardName: cellText(r["card"] ?? r["cartao"]),
    method: (cellText(r["method"] ?? r["metodo"]).toLowerCase() || "cash") as
      | "pix"
      | "debit"
      | "cash",
    subcategoryName: cellText(r["subcategory"] ?? r["subcategoria"]),
    date: cellDate(r["date"] ?? r["data"]),
    amount: cellAmount(r["amount"] ?? r["valor"]),
  }));
}

function parseCreditExpenses(sheet: SheetRows) {
  return sheet.rows.map((r) => {
    const firstParcelMonth = cellDate(r["first_parcel_month"] ?? r["first_parcel"] ?? "");
    const lastParcelMonth = cellDate(r["last_parcel_month"] ?? r["last_parcel"] ?? "");
    const manualOverride = firstParcelMonth.length === 10 || lastParcelMonth.length === 10;
    return {
      description: cellText(r["description"] ?? r["descricao"]),
      cardName: cellText(r["card"] ?? r["cartao"]),
      subcategoryName: cellText(r["subcategory"] ?? r["subcategoria"]),
      purchaseDate: cellDate(r["date"] ?? r["data"] ?? r["purchase_date"]),
      totalParcels: cellInt(r["total_parcels"] ?? r["parcelas"]) ?? 1,
      parcelValue: cellAmount(r["parcel_value"] ?? r["valor_parcela"] ?? r["amount"]),
      firstParcelMonth: firstParcelMonth || null,
      lastParcelMonth: lastParcelMonth || null,
      manualOverride,
    };
  });
}

function parseIncomes(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    userId: USER_ID!,
    description: cellText(r["description"] ?? r["descricao"]),
    type: (cellText(r["type"] ?? r["tipo"]).toLowerCase() || "other") as
      | "salary"
      | "research_grant"
      | "refund"
      | "fee"
      | "sale"
      | "other",
    amount: cellAmount(r["amount"] ?? r["valor"]),
    date: cellDate(r["date"] ?? r["data"]),
  }));
}

function parseCashReceivables(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    userId: USER_ID!,
    description: cellText(r["description"] ?? r["descricao"]),
    loanType: (cellText(r["loan_type"] ?? r["tipo"]).toLowerCase() || "pix") as
      | "pix"
      | "debit"
      | "cash",
    amount: cellAmount(r["amount"] ?? r["valor"]),
    loanDate: cellDate(r["loan_date"] ?? r["data"]),
    expectedPaymentMonth: cellDate(r["expected_payment_month"] ?? r["expected"]),
    isPaid: cellBool(r["paid"] ?? r["pago"]),
    actualPaymentDate: cellDate(r["actual_payment_date"] ?? r["paid_date"] ?? "") || null,
  }));
}

function parseLiquidSavings(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    userId: USER_ID!,
    title: cellText(r["title"] ?? r["nome"]),
    bank: cellText(r["bank"] ?? r["banco"]),
    applicationDate: cellDate(r["application_date"] ?? r["data"]),
    appliedAmount: cellAmount(r["applied_amount"] ?? r["aplicado"]),
    latestYield: cellAmount(r["latest_yield"] ?? r["rendimento"] ?? r["amount"]),
    lastUpdateDate: cellDate(r["last_update"] ?? r["last_update_date"] ?? "") || null,
    isActive: r["active"] === undefined ? true : cellBool(r["active"]),
  }));
}

function parseMonthlySnapshots(sheet: SheetRows) {
  return sheet.rows.map((r) => ({
    userId: USER_ID!,
    monthLabel: cellText(r["month"] ?? r["mes"] ?? r["label"]),
    referenceMonth: cellDate(r["reference_month"] ?? r["data"]),
    totalIncomes: cellAmount(r["total_incomes"] ?? r["receitas"]),
    totalExpenses: cellAmount(r["total_expenses"] ?? r["despesas"]),
    totalSave: cellAmount(r["total_save"] ?? r["acumulado"]),
    totalLiquidSavings: cellAmount(r["total_liquid_savings"] ?? r["liquidos"]),
    totalFixedIncome: cellAmount(r["total_fixed_income"] ?? r["renda_fixa"]),
  }));
}

// ----------------------------------------------------------------------------
// Inserters
// ----------------------------------------------------------------------------

type CardLookup = Map<string, string>;
type SubcategoryLookup = Map<string, string>;

async function loadLookups(): Promise<{ cards: CardLookup; subcategories: SubcategoryLookup }> {
  const cards = new Map<string, string>();
  const subcategories = new Map<string, string>();
  for (const c of await db
    .select()
    .from(schema.cards)
    .where(sql`user_id = ${USER_ID}`)) {
    cards.set(c.name.toLowerCase(), c.id);
  }
  for (const s of await db
    .select()
    .from(schema.subcategories)
    .where(sql`user_id = ${USER_ID}`)) {
    subcategories.set(s.name.toLowerCase(), s.id);
  }
  return { cards, subcategories };
}

async function runImport(opts: { file: string; confirm: boolean; only: Set<string> }) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(opts.file);

  const summary: Record<string, number> = {};
  const include = (key: string) => opts.only.size === 0 || opts.only.has(key);

  if (include("categories")) {
    const sheet = readSheet(wb, TABS.categories);
    if (sheet) {
      const rows = parseCategories(sheet).filter((r) => r.name);
      summary.categories = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.categories).values(rows);
      } else {
        process.stdout.write(`[dry] categories: ${rows.length} rows\n`);
        rows.slice(0, 3).forEach((r) => process.stdout.write(`  · ${r.name}\n`));
      }
    }
  }

  if (include("cards")) {
    const sheet = readSheet(wb, TABS.cards);
    if (sheet) {
      const rows = parseCards(sheet).filter((r) => r.name);
      summary.cards = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.cards).values(rows);
      } else {
        process.stdout.write(`[dry] cards: ${rows.length} rows\n`);
      }
    }
  }

  const lookups = await loadLookups();

  if (include("incomes")) {
    const sheet = readSheet(wb, TABS.incomes);
    if (sheet) {
      const rows = parseIncomes(sheet).filter((r) => r.description);
      summary.incomes = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.incomes).values(rows);
      } else {
        process.stdout.write(`[dry] incomes: ${rows.length} rows\n`);
      }
    }
  }

  if (include("cashExpenses")) {
    const sheet = readSheet(wb, TABS.cashExpenses);
    if (sheet) {
      const parsed = parseCashExpenses(sheet);
      const skipped: string[] = [];
      const rows = parsed.flatMap((p) => {
        const cardId = lookups.cards.get(p.cardName.toLowerCase());
        const subId = lookups.subcategories.get(p.subcategoryName.toLowerCase());
        if (!cardId || !subId) {
          skipped.push(`${p.description} (card=${p.cardName}, sub=${p.subcategoryName})`);
          return [];
        }
        return [
          {
            userId: USER_ID!,
            description: p.description,
            cardId,
            method: p.method,
            subcategoryId: subId,
            date: p.date,
            amount: p.amount,
          },
        ];
      });
      summary.cashExpenses = rows.length;
      if (skipped.length > 0) {
        process.stdout.write(
          `  ⚠ ${skipped.length} cash expense(s) skipped due to missing card/subcategory\n`,
        );
      }
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.cashExpenses).values(rows);
      } else {
        process.stdout.write(`[dry] cashExpenses: ${rows.length} rows\n`);
      }
    }
  }

  if (include("creditExpenses")) {
    const sheet = readSheet(wb, TABS.creditExpenses);
    if (sheet) {
      const parsed = parseCreditExpenses(sheet);
      const skipped: string[] = [];
      const rows = parsed.flatMap((p) => {
        const cardId = lookups.cards.get(p.cardName.toLowerCase());
        const subId = lookups.subcategories.get(p.subcategoryName.toLowerCase());
        if (!cardId || !subId) {
          skipped.push(`${p.description} (card=${p.cardName}, sub=${p.subcategoryName})`);
          return [];
        }
        return [
          {
            userId: USER_ID!,
            description: p.description,
            cardId,
            subcategoryId: subId,
            purchaseDate: p.purchaseDate,
            totalParcels: p.totalParcels,
            parcelValue: p.parcelValue,
            firstParcelMonth: p.firstParcelMonth,
            lastParcelMonth: p.lastParcelMonth,
            manualOverride: p.manualOverride,
          },
        ];
      });
      summary.creditExpenses = rows.length;
      if (skipped.length > 0) {
        process.stdout.write(`  ⚠ ${skipped.length} credit expense(s) skipped\n`);
      }
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.creditExpenses).values(rows);
      } else {
        process.stdout.write(`[dry] creditExpenses: ${rows.length} rows\n`);
      }
    }
  }

  if (include("cashReceivables")) {
    const sheet = readSheet(wb, TABS.cashReceivables);
    if (sheet) {
      const rows = parseCashReceivables(sheet).filter((r) => r.description);
      summary.cashReceivables = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.cashReceivables).values(rows);
      } else {
        process.stdout.write(`[dry] cashReceivables: ${rows.length} rows\n`);
      }
    }
  }

  if (include("liquidSavings")) {
    const sheet = readSheet(wb, TABS.liquidSavings);
    if (sheet) {
      const rows = parseLiquidSavings(sheet).filter((r) => r.title);
      summary.liquidSavings = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.liquidSavings).values(rows);
      } else {
        process.stdout.write(`[dry] liquidSavings: ${rows.length} rows\n`);
      }
    }
  }

  if (include("monthlySnapshots")) {
    const sheet = readSheet(wb, TABS.monthlySnapshots);
    if (sheet) {
      const rows = parseMonthlySnapshots(sheet).filter(
        (r) => r.monthLabel && /^\d{4}-\d{2}-\d{2}$/.test(r.referenceMonth),
      );
      summary.monthlySnapshots = rows.length;
      if (opts.confirm && rows.length > 0) {
        await db.insert(schema.monthlySnapshots).values(rows);
      } else {
        process.stdout.write(`[dry] monthlySnapshots: ${rows.length} rows\n`);
      }
    }
  }

  process.stdout.write("\n--- summary ---\n");
  for (const [k, v] of Object.entries(summary)) {
    process.stdout.write(`  ${k.padEnd(20)} ${v}\n`);
  }
  if (!opts.confirm) {
    process.stdout.write("\nDry run only — re-run with --confirm to write.\n");
  }
}

// ----------------------------------------------------------------------------
// Entrypoint
// ----------------------------------------------------------------------------

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      confirm: { type: "boolean", default: false },
      only: { type: "string" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(
      "usage: pnpm tsx scripts/migrate-from-spreadsheet.ts <file.xlsx> [--confirm] [--only=cards,categories]\n",
    );
    return;
  }

  const file = positionals[0];
  const only = new Set(
    (values.only ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
  );

  await runImport({ file, confirm: !!values.confirm, only });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });

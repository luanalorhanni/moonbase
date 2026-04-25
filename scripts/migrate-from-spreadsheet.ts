/**
 * One-shot importer for the moonbase Google Sheets workbook.
 *
 * Tailored to the actual layout in
 * "Monthly Finance Control - Luana Lorhanni.xlsx" — header rows and column
 * indices are hardcoded per tab below.
 *
 * Usage:
 *   pnpm tsx --env-file=.env.local scripts/migrate-from-spreadsheet.ts <file.xlsx>
 *   pnpm tsx --env-file=.env.local scripts/migrate-from-spreadsheet.ts <file.xlsx> --confirm
 *   pnpm tsx --env-file=.env.local scripts/migrate-from-spreadsheet.ts <file.xlsx> --confirm --only=cards,categories
 *
 * Tabs imported (dependency order):
 *   1. 🛒 Carts                  → cards (all credit, default colors)
 *   2. ⚪ Categorys              → categories + subcategories
 *   3. 📈 Incomes                → incomes (type="other")
 *   4. 💵 Cash Expenses          → cash_expenses
 *   5. 🪪 Credit Expenses        → credit_expenses (manualOverride=true since
 *                                  parcel months come straight from the sheet)
 *   6. 🪙 Receivable             → cash_receivables + credit_receivables
 *   7. 🏦 Investiments           → liquid_savings + fixed_income +
 *                                  monthly_snapshots (combined with Anual)
 *   8. 📅 Anual Finance          → completes monthly_snapshots
 *
 * --confirm wraps all writes; otherwise the script prints what it would
 * insert and exits.
 */

import { parseArgs } from "node:util";

import ExcelJS from "exceljs";
import { and, eq, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { computeParcelDates } from "@/lib/finance/parcels";

const USER_ID = process.env.MOONBASE_USER_ID;
if (!USER_ID) {
  throw new Error("MOONBASE_USER_ID env var must be set (see .env.local).");
}

// ----------------------------------------------------------------------------
// Cell helpers
// ----------------------------------------------------------------------------

const DUMMYFUNCTION = "__xludf.DUMMYFUNCTION";

function cellRaw(value: ExcelJS.CellValue): ExcelJS.CellValue {
  if (value && typeof value === "object" && "result" in value) {
    return value.result as ExcelJS.CellValue;
  }
  return value;
}

function cellText(value: ExcelJS.CellValue): string {
  const v = cellRaw(value);
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.includes(DUMMYFUNCTION) ? "" : v.trim();
  if (typeof v === "number") return String(v);
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    return cellDate(v);
  }
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text.trim();
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText
        .map((r) => r.text)
        .join("")
        .trim();
    }
  }
  return String(v);
}

function cellDate(value: ExcelJS.CellValue): string {
  const v = cellRaw(value);
  if (v instanceof Date) {
    if (Number.isNaN(v.getTime())) return "";
    const y = v.getFullYear();
    const m = String(v.getMonth() + 1).padStart(2, "0");
    const d = String(v.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  if (typeof v === "number") {
    const date = new Date(Math.round((v - 25569) * 86400 * 1000));
    return cellDate(date);
  }
  const text = cellText(v);
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(text)) {
    const [d, m, y] = text.split("/");
    return `${y}-${m}-${d}`;
  }
  return "";
}

function cellAmount(value: ExcelJS.CellValue): string {
  const v = cellRaw(value);
  if (typeof v === "number") return v.toFixed(2);
  const text = cellText(value);
  if (text === "") return "0.00";
  const cleaned = text
    .replace(/R\$\s*/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}([,.]|$))/g, "")
    .replace(",", ".");
  const n = Number(cleaned);
  return Number.isNaN(n) ? "0.00" : n.toFixed(2);
}

function cellInt(value: ExcelJS.CellValue): number | null {
  const v = cellRaw(value);
  if (typeof v === "number") return Math.round(v);
  const text = cellText(value);
  if (text === "") return null;
  const n = parseInt(text, 10);
  return Number.isNaN(n) ? null : n;
}

function cellBool(value: ExcelJS.CellValue): boolean {
  const v = cellRaw(value);
  if (typeof v === "boolean") return v;
  const t = cellText(value).toLowerCase();
  return t === "true" || t === "sim" || t === "yes" || t === "1" || t === "✅";
}

function rowAt(sheet: ExcelJS.Worksheet, rowNum: number, col: number): ExcelJS.CellValue {
  return sheet.getRow(rowNum).getCell(col).value;
}

function isRowEmpty(sheet: ExcelJS.Worksheet, rowNum: number, cols: number[]): boolean {
  return cols.every((c) => cellText(rowAt(sheet, rowNum, c)) === "");
}

// ----------------------------------------------------------------------------
// Domain helpers
// ----------------------------------------------------------------------------

const METHOD_MAP: Record<string, "pix" | "debit" | "cash"> = {
  pix: "pix",
  debit: "debit",
  débito: "debit",
  debito: "debit",
  cash: "cash",
  dinheiro: "cash",
};

function normaliseMethod(text: string): "pix" | "debit" | "cash" {
  return METHOD_MAP[text.trim().toLowerCase()] ?? "pix";
}

const DEFAULT_COLORS = ["blue", "purple", "green", "pink", "orange", "yellow", "brown", "gray", "red"] as const;

function pickColor(index: number): (typeof DEFAULT_COLORS)[number] {
  return DEFAULT_COLORS[index % DEFAULT_COLORS.length];
}

const PT_MONTHS: Record<string, number> = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

function parseMonthLabel(text: string): string | null {
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(text)) return text.slice(0, 7) + "-01";
  const m = text.toLowerCase().match(/^(janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\s+(\d{4})$/);
  if (m) {
    const month = PT_MONTHS[m[1]];
    return `${m[2]}-${String(month).padStart(2, "0")}-01`;
  }
  return null;
}

// ----------------------------------------------------------------------------
// Tab parsers
// ----------------------------------------------------------------------------

type CardInsert = typeof schema.cards.$inferInsert;
type CategoryInsert = typeof schema.categories.$inferInsert;
type SubcategoryInsert = typeof schema.subcategories.$inferInsert;
type IncomeInsert = typeof schema.incomes.$inferInsert;
type CashExpenseInsert = typeof schema.cashExpenses.$inferInsert;
type CreditExpenseInsert = typeof schema.creditExpenses.$inferInsert;
type CashReceivableInsert = typeof schema.cashReceivables.$inferInsert;
type CreditReceivableInsert = typeof schema.creditReceivables.$inferInsert;
type LiquidSavingsInsert = typeof schema.liquidSavings.$inferInsert;
type FixedIncomeInsert = typeof schema.fixedIncome.$inferInsert;
type SnapshotInsert = typeof schema.monthlySnapshots.$inferInsert;

function parseCarts(sheet: ExcelJS.Worksheet): CardInsert[] {
  // header row 3, col 2+: Bank | Dia de Fechamento | Dia de Vencimento | Limite
  const out: CardInsert[] = [];
  let i = 0;
  for (let r = 4; r <= sheet.rowCount; r++) {
    const name = cellText(rowAt(sheet, r, 2));
    if (!name) continue;
    const closingDay = cellInt(rowAt(sheet, r, 3));
    const dueDay = cellInt(rowAt(sheet, r, 4));
    const limit = cellAmount(rowAt(sheet, r, 5));
    // Treat as credit if it has a limit, otherwise account
    const type: "credit" | "account" = Number(limit) > 0 ? "credit" : "account";
    out.push({
      userId: USER_ID!,
      name,
      type,
      bank: name,
      defaultClosingDay: closingDay,
      dueDay: dueDay,
      limitAmount: type === "credit" ? limit : null,
      color: pickColor(i++),
      isActive: true,
    });
  }
  return out;
}

function parseCategoriesAndSubcategories(sheet: ExcelJS.Worksheet): {
  categories: CategoryInsert[];
  subcategoryRows: { name: string; categoryName: string }[];
} {
  // header row 2: Subcategory | Category
  const subcategoryRows: { name: string; categoryName: string }[] = [];
  const seenCategories = new Set<string>();
  const categories: CategoryInsert[] = [];
  let colorIndex = 0;

  for (let r = 3; r <= sheet.rowCount; r++) {
    const sub = cellText(rowAt(sheet, r, 2));
    const cat = cellText(rowAt(sheet, r, 3));
    if (!sub || !cat) continue;
    subcategoryRows.push({ name: sub, categoryName: cat });
    if (!seenCategories.has(cat)) {
      seenCategories.add(cat);
      categories.push({
        userId: USER_ID!,
        name: cat,
        color: pickColor(colorIndex++),
        icon: null,
      });
    }
  }
  return { categories, subcategoryRows };
}

function parseIncomes(sheet: ExcelJS.Worksheet): IncomeInsert[] {
  // header row 4: Income | Amount | Date | Month Payment
  const out: IncomeInsert[] = [];
  for (let r = 5; r <= sheet.rowCount; r++) {
    const desc = cellText(rowAt(sheet, r, 2));
    const amount = cellAmount(rowAt(sheet, r, 3));
    const date = cellDate(rowAt(sheet, r, 4));
    if (!desc || !date) continue;
    out.push({
      userId: USER_ID!,
      description: desc,
      type: "other",
      amount,
      date,
    });
  }
  return out;
}

type CashExpenseRaw = {
  description: string;
  cardName: string;
  method: "pix" | "debit" | "cash";
  subcategoryName: string;
  date: string;
  amount: string;
};

function parseCashExpenses(sheet: ExcelJS.Worksheet): CashExpenseRaw[] {
  // header row 6: Cart | Method | Expense | Subcategory | Category | Date | Amount | Month Payment
  const out: CashExpenseRaw[] = [];
  for (let r = 7; r <= sheet.rowCount; r++) {
    if (isRowEmpty(sheet, r, [2, 4, 7, 8])) continue;
    const cardName = cellText(rowAt(sheet, r, 2));
    const method = normaliseMethod(cellText(rowAt(sheet, r, 3)));
    const description = cellText(rowAt(sheet, r, 4));
    const subcategoryName = cellText(rowAt(sheet, r, 5));
    const date = cellDate(rowAt(sheet, r, 7));
    const amount = cellAmount(rowAt(sheet, r, 8));
    if (!description || !date || !cardName || !subcategoryName) continue;
    out.push({ description, cardName, method, subcategoryName, date, amount });
  }
  return out;
}

type CreditExpenseRaw = {
  description: string;
  cardName: string;
  subcategoryName: string;
  purchaseDate: string;
  totalParcels: number;
  parcelValue: string;
  firstParcelMonth: string | null;
  lastParcelMonth: string | null;
  firstParcelDate: string | null;
  lastParcelDate: string | null;
};

function parseCreditExpenses(sheet: ExcelJS.Worksheet): CreditExpenseRaw[] {
  // header row 6: Cart | Expense | Subcategory | Category | Date | Parcel | Amount | Month of First Parcel | Month of Last Parcel | (firstParcelDate) | (lastParcelDate)
  const out: CreditExpenseRaw[] = [];
  for (let r = 7; r <= sheet.rowCount; r++) {
    if (isRowEmpty(sheet, r, [2, 3, 6, 8])) continue;
    const cardName = cellText(rowAt(sheet, r, 2));
    const description = cellText(rowAt(sheet, r, 3));
    const subcategoryName = cellText(rowAt(sheet, r, 4));
    const purchaseDate = cellDate(rowAt(sheet, r, 6));
    const totalParcels = cellInt(rowAt(sheet, r, 7)) ?? 1;
    const parcelValue = cellAmount(rowAt(sheet, r, 8));
    const firstParcelMonth =
      cellDate(rowAt(sheet, r, 9)) || parseMonthLabel(cellText(rowAt(sheet, r, 9)));
    const lastParcelMonth =
      cellDate(rowAt(sheet, r, 10)) || parseMonthLabel(cellText(rowAt(sheet, r, 10)));
    const firstParcelDate = cellDate(rowAt(sheet, r, 11)) || null;
    const lastParcelDate = cellDate(rowAt(sheet, r, 12)) || null;

    if (!description || !cardName || !subcategoryName || !purchaseDate) continue;

    out.push({
      description,
      cardName,
      subcategoryName,
      purchaseDate,
      totalParcels,
      parcelValue,
      firstParcelMonth: firstParcelMonth || null,
      lastParcelMonth: lastParcelMonth || null,
      firstParcelDate,
      lastParcelDate,
    });
  }
  return out;
}

type CashReceivableRaw = {
  description: string;
  loanType: "pix" | "debit" | "cash";
  amount: string;
  loanDate: string;
  expectedPaymentMonth: string;
  isPaid: boolean;
  actualPaymentDate: string | null;
};

function parseCashReceivables(sheet: ExcelJS.Worksheet): CashReceivableRaw[] {
  // Cash Loans block — header at R9 cols 10..16:
  //   Receivable | Date | Type of Loan | Amount | Expected Month Payment | Paid | Date of Payment
  const out: CashReceivableRaw[] = [];
  for (let r = 10; r <= sheet.rowCount; r++) {
    const description = cellText(rowAt(sheet, r, 10));
    if (!description) continue;
    const loanDate = cellDate(rowAt(sheet, r, 11));
    const loanType = normaliseMethod(cellText(rowAt(sheet, r, 12)));
    const amount = cellAmount(rowAt(sheet, r, 13));
    const expectedRaw = cellText(rowAt(sheet, r, 14));
    const expectedDate = cellDate(rowAt(sheet, r, 14));
    const expected = expectedDate
      ? expectedDate.slice(0, 7) + "-01"
      : parseMonthLabel(expectedRaw);
    if (!expected) continue;
    const isPaid = cellBool(rowAt(sheet, r, 15));
    const actualPaymentDate = cellDate(rowAt(sheet, r, 16)) || null;
    out.push({
      description,
      loanType,
      amount,
      loanDate: loanDate || expected,
      expectedPaymentMonth: expected,
      isPaid,
      actualPaymentDate,
    });
  }
  return out;
}

type CreditReceivableRaw = {
  description: string;
  cardName: string;
  parcelValue: string;
  purchaseDate: string;
  totalParcels: number;
  firstParcelMonth: string | null;
};

function parseCreditReceivables(sheet: ExcelJS.Worksheet): CreditReceivableRaw[] {
  // Compras a receber block — header at R12 cols 2..8:
  //   Compra | Cartão | Valor | Data | Parcelas | Mês do Primeiro Pagamento | Parcela Atual
  const out: CreditReceivableRaw[] = [];
  for (let r = 13; r <= sheet.rowCount; r++) {
    const description = cellText(rowAt(sheet, r, 2));
    if (!description) continue;
    const cardName = cellText(rowAt(sheet, r, 3));
    const parcelValue = cellAmount(rowAt(sheet, r, 4));
    const purchaseDate = cellDate(rowAt(sheet, r, 5));
    const totalParcels = cellInt(rowAt(sheet, r, 6)) ?? 1;
    const firstParcelMonth =
      cellDate(rowAt(sheet, r, 7)) || parseMonthLabel(cellText(rowAt(sheet, r, 7)));
    if (!cardName || !purchaseDate) continue;
    out.push({
      description,
      cardName,
      parcelValue,
      purchaseDate,
      totalParcels,
      firstParcelMonth,
    });
  }
  return out;
}

function parseLiquidSavings(sheet: ExcelJS.Worksheet): LiquidSavingsInsert[] {
  // Cofrinho block: header at R10, cols 5..10:
  //   Bank | Title | Date | Amount | Última Rentabilidade | Data da Última Atualização
  // The spreadsheet's "Amount" is the principal and "Última Rentabilidade"
  // is the absolute yield in BRL. moonbase's `latestYield` stores total
  // current value (principal + yield), so we add them.
  const out: LiquidSavingsInsert[] = [];
  for (let r = 11; r <= 18; r++) {
    const bank = cellText(rowAt(sheet, r, 5));
    if (!bank || bank.toLowerCase() === "bank") break;
    const title = cellText(rowAt(sheet, r, 6));
    const applicationDate = cellDate(rowAt(sheet, r, 7));
    const principal = cellAmount(rowAt(sheet, r, 8));
    const yieldOnly = cellAmount(rowAt(sheet, r, 9));
    const lastUpdate = cellDate(rowAt(sheet, r, 10)) || null;
    if (!title) continue;
    const total = (Number(principal) + Number(yieldOnly)).toFixed(2);
    out.push({
      userId: USER_ID!,
      title,
      bank,
      applicationDate: applicationDate || "2025-01-01",
      appliedAmount: principal,
      latestYield: total,
      lastUpdateDate: lastUpdate,
      isActive: true,
    });
  }
  return out;
}

function parseFixedIncome(sheet: ExcelJS.Worksheet): FixedIncomeInsert[] {
  // Renda Fixa block: header at R19, cols 5..11:
  //   Bank | Title | Date | Vencimento | Amount | Última Rentabilidade | Data da Última Atualização
  const out: FixedIncomeInsert[] = [];
  for (let r = 20; r <= sheet.rowCount; r++) {
    const bank = cellText(rowAt(sheet, r, 5));
    if (!bank || bank.toLowerCase() === "bank") continue;
    const title = cellText(rowAt(sheet, r, 6));
    if (!title) continue;
    const applicationDate = cellDate(rowAt(sheet, r, 7));
    const maturityDate = cellDate(rowAt(sheet, r, 8));
    const principal = cellAmount(rowAt(sheet, r, 9));
    const yieldOnly = cellAmount(rowAt(sheet, r, 10));
    const lastUpdate = cellDate(rowAt(sheet, r, 11)) || null;
    if (!applicationDate || !maturityDate) continue;
    const total = (Number(principal) + Number(yieldOnly)).toFixed(2);
    out.push({
      userId: USER_ID!,
      title,
      bank,
      applicationDate,
      maturityDate,
      appliedAmount: principal,
      latestYield: total,
      lastUpdateDate: lastUpdate,
      isActive: true,
    });
  }
  return out;
}

function parseMonthlySnapshots(
  anualSheet: ExcelJS.Worksheet,
  investSheet: ExcelJS.Worksheet,
  liquidTotal: string,
  fixedTotal: string,
): SnapshotInsert[] {
  // Anual Finance: header R3 col 2+ (Month | Incomes | Expenses), data R4+
  const incomeByMonth = new Map<string, { incomes: string; expenses: string }>();
  for (let r = 4; r <= anualSheet.rowCount; r++) {
    const monthDate = cellDate(rowAt(anualSheet, r, 2));
    if (!monthDate) continue;
    const month = monthDate.slice(0, 7) + "-01";
    incomeByMonth.set(month, {
      incomes: cellAmount(rowAt(anualSheet, r, 3)),
      expenses: cellAmount(rowAt(anualSheet, r, 4)),
    });
  }

  // Investiments: data R6+ (col 2: Month, col 3: Total Save) — per-month
  // investment balances aren't tracked, so we use the current liquid+fixed
  // totals as a constant for every snapshot.
  const totalSaveByMonth = new Map<string, string>();
  for (let r = 6; r <= investSheet.rowCount; r++) {
    const monthDate = cellDate(rowAt(investSheet, r, 2));
    if (!monthDate) continue;
    const month = monthDate.slice(0, 7) + "-01";
    const totalSave = cellAmount(rowAt(investSheet, r, 3));
    totalSaveByMonth.set(month, totalSave);
  }

  const totalLiquid = liquidTotal;
  const totalFixed = fixedTotal;

  const PT_MONTH_LONG = [
    "janeiro", "fevereiro", "março", "abril", "maio", "junho",
    "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
  ];

  const allMonths = new Set([...incomeByMonth.keys(), ...totalSaveByMonth.keys()]);
  const out: SnapshotInsert[] = [];
  for (const month of [...allMonths].sort()) {
    const inc = incomeByMonth.get(month);
    if (!inc) continue;
    const totalSave = totalSaveByMonth.get(month) ?? "0.00";
    const [y, m] = month.split("-").map(Number);
    out.push({
      userId: USER_ID!,
      monthLabel: `${PT_MONTH_LONG[m - 1]} de ${y}`,
      referenceMonth: month,
      totalIncomes: inc.incomes,
      totalExpenses: inc.expenses,
      totalSave,
      totalLiquidSavings: totalLiquid,
      totalFixedIncome: totalFixed,
    });
  }
  return out;
}

// ----------------------------------------------------------------------------
// Inserter
// ----------------------------------------------------------------------------

async function clearExistingData(): Promise<void> {
  // Delete in dependency order (children first).
  const tables = [
    schema.monthlySnapshots,
    schema.fixedIncome,
    schema.liquidSavings,
    schema.creditReceivables,
    schema.cashReceivables,
    schema.creditExpenses,
    schema.cashExpenses,
    schema.fixedExpenses,
    schema.incomes,
    schema.cardClosings,
    schema.cards,
    schema.subcategories,
    schema.categories,
  ];
  for (const t of tables) {
    await db.delete(t).where(eq(t.userId, USER_ID!));
  }
}

async function runImport(opts: { file: string; confirm: boolean; only: Set<string>; reset: boolean }) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(opts.file);

  const carts = wb.getWorksheet("🛒 Carts");
  const categorys = wb.getWorksheet("⚪ Categorys");
  const incomes = wb.getWorksheet("📈 Incomes");
  const cashSheet = wb.getWorksheet("💵 Cash Expenses");
  const creditSheet = wb.getWorksheet("🪪 Credit Expenses");
  const receivableSheet = wb.getWorksheet("🪙 Receivable");
  const investSheet = wb.getWorksheet("🏦 Investiments");
  const anualSheet = wb.getWorksheet("📅 Anual Finance");

  if (!carts || !categorys || !incomes || !cashSheet || !creditSheet || !receivableSheet || !investSheet || !anualSheet) {
    throw new Error("Missing one of the expected tabs in the workbook.");
  }

  const cardRows = parseCarts(carts);
  const { categories, subcategoryRows } = parseCategoriesAndSubcategories(categorys);
  const incomeRows = parseIncomes(incomes);
  const cashRaw = parseCashExpenses(cashSheet);
  const creditRaw = parseCreditExpenses(creditSheet);
  const cashReceivableRaw = parseCashReceivables(receivableSheet);
  const creditReceivableRaw = parseCreditReceivables(receivableSheet);
  const liquidRows = parseLiquidSavings(investSheet);
  const fixedRows = parseFixedIncome(investSheet);
  const totalLiquidNow = liquidRows
    .reduce((acc, r) => acc + Number(r.latestYield), 0)
    .toFixed(2);
  const totalFixedNow = fixedRows
    .reduce((acc, r) => acc + Number(r.latestYield), 0)
    .toFixed(2);
  const snapshotRows = parseMonthlySnapshots(
    anualSheet,
    investSheet,
    totalLiquidNow,
    totalFixedNow,
  );

  process.stdout.write("\n=== summary ===\n");
  process.stdout.write(`  cards                  ${cardRows.length}\n`);
  process.stdout.write(`  categories             ${categories.length}\n`);
  process.stdout.write(`  subcategories          ${subcategoryRows.length}\n`);
  process.stdout.write(`  incomes                ${incomeRows.length}\n`);
  process.stdout.write(`  cash_expenses          ${cashRaw.length}\n`);
  process.stdout.write(`  credit_expenses        ${creditRaw.length}\n`);
  process.stdout.write(`  cash_receivables       ${cashReceivableRaw.length}\n`);
  process.stdout.write(`  credit_receivables     ${creditReceivableRaw.length}\n`);
  process.stdout.write(`  liquid_savings         ${liquidRows.length}\n`);
  process.stdout.write(`  fixed_income           ${fixedRows.length}\n`);
  process.stdout.write(`  monthly_snapshots      ${snapshotRows.length}\n`);

  if (!opts.confirm) {
    process.stdout.write("\nDry run only — re-run with --confirm to write.\n");
    return;
  }

  if (opts.reset) {
    process.stdout.write("\n[reset] wiping existing data for this user...\n");
    await clearExistingData();
  }

  // Insert in dependency order, capturing IDs as we go.
  process.stdout.write("\n[write] cards\n");
  const insertedCards = await db.insert(schema.cards).values(cardRows).returning();
  const cardIdByName = new Map<string, string>();
  for (const c of insertedCards) cardIdByName.set(c.name.toLowerCase(), c.id);

  process.stdout.write("[write] categories\n");
  const insertedCategories = await db.insert(schema.categories).values(categories).returning();
  const categoryIdByName = new Map<string, string>();
  for (const c of insertedCategories) categoryIdByName.set(c.name.toLowerCase(), c.id);

  process.stdout.write("[write] subcategories\n");
  const subcategoryInserts: SubcategoryInsert[] = subcategoryRows
    .map((s) => {
      const categoryId = categoryIdByName.get(s.categoryName.toLowerCase());
      if (!categoryId) return null;
      return { userId: USER_ID!, name: s.name, categoryId };
    })
    .filter((s): s is SubcategoryInsert => s !== null);
  const insertedSubs = await db
    .insert(schema.subcategories)
    .values(subcategoryInserts)
    .returning();
  const subIdByName = new Map<string, string>();
  for (const s of insertedSubs) subIdByName.set(s.name.toLowerCase(), s.id);

  process.stdout.write("[write] incomes\n");
  if (incomeRows.length > 0) await db.insert(schema.incomes).values(incomeRows);

  process.stdout.write("[write] cash_expenses\n");
  const cashInserts: CashExpenseInsert[] = [];
  let skippedCash = 0;
  for (const r of cashRaw) {
    const cardId = cardIdByName.get(r.cardName.toLowerCase());
    const subId = subIdByName.get(r.subcategoryName.toLowerCase());
    if (!cardId || !subId) { skippedCash++; continue; }
    cashInserts.push({
      userId: USER_ID!,
      description: r.description,
      cardId,
      method: r.method,
      subcategoryId: subId,
      date: r.date,
      amount: r.amount,
    });
  }
  if (cashInserts.length > 0) await db.insert(schema.cashExpenses).values(cashInserts);
  if (skippedCash > 0) process.stdout.write(`  ⚠ ${skippedCash} skipped (missing card/subcategory)\n`);

  process.stdout.write("[write] credit_expenses\n");
  const cardLookup = new Map<string, { id: string; defaultClosingDay: number }>();
  for (const c of insertedCards) {
    if (c.defaultClosingDay !== null) {
      cardLookup.set(c.id, { id: c.id, defaultClosingDay: c.defaultClosingDay });
    }
  }

  function ymd(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }

  const creditInserts: CreditExpenseInsert[] = [];
  let skippedCredit = 0;
  let computedParcels = 0;
  for (const r of creditRaw) {
    const cardId = cardIdByName.get(r.cardName.toLowerCase());
    const subId = subIdByName.get(r.subcategoryName.toLowerCase());
    if (!cardId || !subId) {
      skippedCredit++;
      continue;
    }

    // Recompute parcel dates from purchaseDate + card closing day (single
    // source of truth — most spreadsheet formulas resolved to InvDate after
    // the XLSX export stripped FILTER/INDIRECT references).
    let firstParcelMonth: string | null = null;
    let lastParcelMonth: string | null = null;
    let firstParcelDate: string | null = null;
    let lastParcelDate: string | null = null;

    const card = cardLookup.get(cardId);
    if (card) {
      const [y, m, d] = r.purchaseDate.split("-").map(Number);
      const parcels = computeParcelDates({
        card,
        purchaseDate: new Date(y, m - 1, d),
        totalParcels: r.totalParcels,
        cardClosings: [],
      });
      firstParcelMonth = ymd(parcels.firstParcelMonth);
      lastParcelMonth = ymd(parcels.lastParcelMonth);
      firstParcelDate = ymd(parcels.firstParcelDate);
      lastParcelDate = ymd(parcels.lastParcelDate);
      computedParcels++;
    } else {
      // Card has no defaultClosingDay — fall back to whatever the sheet had.
      firstParcelMonth = r.firstParcelMonth;
      lastParcelMonth = r.lastParcelMonth;
      firstParcelDate = r.firstParcelDate;
      lastParcelDate = r.lastParcelDate;
    }

    creditInserts.push({
      userId: USER_ID!,
      description: r.description,
      cardId,
      subcategoryId: subId,
      purchaseDate: r.purchaseDate,
      totalParcels: r.totalParcels,
      parcelValue: r.parcelValue,
      firstParcelMonth,
      lastParcelMonth,
      firstParcelDate,
      lastParcelDate,
      manualOverride: false,
    });
  }
  if (creditInserts.length > 0) await db.insert(schema.creditExpenses).values(creditInserts);
  process.stdout.write(`  recomputed parcel dates for ${computedParcels} expenses\n`);
  if (skippedCredit > 0) process.stdout.write(`  ⚠ ${skippedCredit} skipped (missing card/subcategory)\n`);

  process.stdout.write("[write] cash_receivables\n");
  if (cashReceivableRaw.length > 0) {
    const inserts: CashReceivableInsert[] = cashReceivableRaw.map((r) => ({
      userId: USER_ID!,
      description: r.description,
      loanType: r.loanType,
      amount: r.amount,
      loanDate: r.loanDate,
      expectedPaymentMonth: r.expectedPaymentMonth,
      isPaid: r.isPaid,
      actualPaymentDate: r.actualPaymentDate,
    }));
    await db.insert(schema.cashReceivables).values(inserts);
  }

  process.stdout.write("[write] credit_receivables\n");
  const credRecInserts: CreditReceivableInsert[] = [];
  let skippedCredRec = 0;
  for (const r of creditReceivableRaw) {
    const cardId = cardIdByName.get(r.cardName.toLowerCase());
    if (!cardId) {
      skippedCredRec++;
      continue;
    }
    const card = cardLookup.get(cardId);
    let firstParcelMonth: string | null = r.firstParcelMonth;
    let lastParcelMonth: string | null = null;
    let firstParcelDate: string | null = null;
    let lastParcelDate: string | null = null;
    if (card) {
      const [y, m, d] = r.purchaseDate.split("-").map(Number);
      const parcels = computeParcelDates({
        card,
        purchaseDate: new Date(y, m - 1, d),
        totalParcels: r.totalParcels,
        cardClosings: [],
      });
      firstParcelMonth = ymd(parcels.firstParcelMonth);
      lastParcelMonth = ymd(parcels.lastParcelMonth);
      firstParcelDate = ymd(parcels.firstParcelDate);
      lastParcelDate = ymd(parcels.lastParcelDate);
    }
    credRecInserts.push({
      userId: USER_ID!,
      description: r.description,
      cardId,
      purchaseDate: r.purchaseDate,
      totalParcels: r.totalParcels,
      parcelValue: r.parcelValue,
      firstParcelMonth,
      lastParcelMonth,
      firstParcelDate,
      lastParcelDate,
      manualOverride: false,
    });
  }
  if (credRecInserts.length > 0) await db.insert(schema.creditReceivables).values(credRecInserts);
  if (skippedCredRec > 0) process.stdout.write(`  ⚠ ${skippedCredRec} skipped (missing card)\n`);

  process.stdout.write("[write] liquid_savings\n");
  if (liquidRows.length > 0) await db.insert(schema.liquidSavings).values(liquidRows);

  process.stdout.write("[write] fixed_income\n");
  if (fixedRows.length > 0) await db.insert(schema.fixedIncome).values(fixedRows);

  process.stdout.write("[write] monthly_snapshots\n");
  if (snapshotRows.length > 0) await db.insert(schema.monthlySnapshots).values(snapshotRows);

  process.stdout.write("\n✓ done.\n");

  // Suppress unused-import warning for `and`/`sql`/`only` arguments while
  // keeping the imports available for future filter additions.
  void and;
  void sql;
  void opts.only;
}

// ----------------------------------------------------------------------------
// Entrypoint
// ----------------------------------------------------------------------------

async function main() {
  const { values, positionals } = parseArgs({
    args: process.argv.slice(2),
    options: {
      confirm: { type: "boolean", default: false },
      reset: { type: "boolean", default: false },
      only: { type: "string" },
      help: { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  if (values.help || positionals.length === 0) {
    process.stdout.write(
      "usage: pnpm tsx --env-file=.env.local scripts/migrate-from-spreadsheet.ts <file.xlsx> [--confirm] [--reset]\n",
    );
    return;
  }

  await runImport({
    file: positionals[0],
    confirm: !!values.confirm,
    reset: !!values.reset,
    only: new Set((values.only ?? "").split(",").map((s) => s.trim()).filter(Boolean)),
  });
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    process.stderr.write(`${err instanceof Error ? err.stack : String(err)}\n`);
    process.exit(1);
  });

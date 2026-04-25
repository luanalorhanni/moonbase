import ExcelJS from "exceljs";

const wb = new ExcelJS.Workbook();
await wb.xlsx.readFile(process.argv[2]);

const tab = process.argv[3];
const fromRow = Number(process.argv[4] ?? 1);
const toRow = Number(process.argv[5] ?? 8);

function cellStr(v) {
  if (v === null || v === undefined) return "";
  if (typeof v === "object" && v && "text" in v) return String(v.text);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === "object" && v && "result" in v) return cellStr(v.result);
  return String(v);
}

const sheet = wb.getWorksheet(tab);
if (!sheet) {
  process.stdout.write(`No tab "${tab}". Available:\n`);
  wb.eachSheet((s) => process.stdout.write(`  - ${s.name}\n`));
  process.exit(1);
}

process.stdout.write(`=== "${sheet.name}" rows ${fromRow}..${toRow} (total: ${sheet.rowCount}) ===\n`);
for (let r = fromRow; r <= Math.min(toRow, sheet.rowCount); r++) {
  const cells = [];
  sheet.getRow(r).eachCell({ includeEmpty: true }, (c) => {
    cells.push(cellStr(c.value).slice(0, 30));
  });
  process.stdout.write(`  R${r}: ${cells.join(" | ")}\n`);
}

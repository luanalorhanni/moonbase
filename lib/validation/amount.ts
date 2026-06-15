/**
 * Money inputs across the app accept Brazilian-style decimals (comma) but
 * the database stores `numeric(12,2)` strings with a period. These helpers
 * keep the conversion in one place so the form ↔ API boundary stays sane.
 *
 * Accepted shapes on input:
 *   "1234"      → "1234"
 *   "1234,56"   → "1234.56"     (BR decimal — preferred)
 *   "1234.56"   → "1234.56"     (US decimal, still allowed for paste / muscle memory)
 *
 * Thousand separators are NOT supported on input — users rarely type them
 * and supporting them creates ambiguity ("199,901" — is that 199.901 or
 * 199 thousand and 901?). Keep the contract tight.
 */

/** A non-empty integer, optionally followed by 1–2 decimal digits using `.` or `,`. */
const FLEXIBLE_AMOUNT = /^\d+([.,]\d{1,2})?$/;

/** Convert the BR-style comma decimal to a period (the DB format). */
export function toApiAmount(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  return trimmed.replace(",", ".");
}

/** Convert a stored API value ("1234.56") to the BR-style string shown in the form ("1234,56"). */
export function toFormAmount(value: string | null | undefined): string {
  if (value == null || value === "") return "";
  return String(value).replace(".", ",");
}

/** Validate a raw amount string from the form. */
export function isValidAmountInput(raw: string): boolean {
  return FLEXIBLE_AMOUNT.test(raw.trim());
}

/** Standard error message shared by every money field. */
export const AMOUNT_ERROR_MESSAGE = "use 1234,56 (vírgula como separador decimal)";

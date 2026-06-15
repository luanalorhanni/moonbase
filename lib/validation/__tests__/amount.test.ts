import { describe, expect, it } from "vitest";

import { AMOUNT_ERROR_MESSAGE, isValidAmountInput, toApiAmount, toFormAmount } from "../amount";

describe("toApiAmount", () => {
  it("returns empty string for empty input", () => {
    expect(toApiAmount("")).toBe("");
    expect(toApiAmount("   ")).toBe("");
  });

  it("passes through integer values unchanged", () => {
    expect(toApiAmount("1234")).toBe("1234");
  });

  it("converts BR-style decimals (comma) to period", () => {
    expect(toApiAmount("199,90")).toBe("199.90");
    expect(toApiAmount("0,5")).toBe("0.5");
  });

  it("leaves period decimals untouched", () => {
    expect(toApiAmount("199.90")).toBe("199.90");
  });

  it("trims leading/trailing whitespace", () => {
    expect(toApiAmount("  29,90  ")).toBe("29.90");
  });
});

describe("toFormAmount", () => {
  it("returns empty string for null/undefined/empty", () => {
    expect(toFormAmount(null)).toBe("");
    expect(toFormAmount(undefined)).toBe("");
    expect(toFormAmount("")).toBe("");
  });

  it("converts API period to BR comma for display", () => {
    expect(toFormAmount("199.90")).toBe("199,90");
    expect(toFormAmount("1234.56")).toBe("1234,56");
  });

  it("leaves integers unchanged", () => {
    expect(toFormAmount("100")).toBe("100");
  });
});

describe("isValidAmountInput", () => {
  it("accepts BR-style amounts (comma decimal)", () => {
    expect(isValidAmountInput("199,90")).toBe(true);
    expect(isValidAmountInput("0,5")).toBe(true);
    expect(isValidAmountInput("0,99")).toBe(true);
  });

  it("accepts US-style amounts (period decimal)", () => {
    expect(isValidAmountInput("199.90")).toBe(true);
    expect(isValidAmountInput("0.5")).toBe(true);
  });

  it("accepts integers", () => {
    expect(isValidAmountInput("1234")).toBe(true);
    expect(isValidAmountInput("0")).toBe(true);
  });

  it("trims whitespace before validating", () => {
    expect(isValidAmountInput("  29,90  ")).toBe(true);
  });

  it("rejects empty input", () => {
    expect(isValidAmountInput("")).toBe(false);
    expect(isValidAmountInput("   ")).toBe(false);
  });

  it("rejects values with letters or symbols", () => {
    expect(isValidAmountInput("abc")).toBe(false);
    expect(isValidAmountInput("R$ 100")).toBe(false);
    expect(isValidAmountInput("100reais")).toBe(false);
  });

  it("rejects more than two decimal places", () => {
    expect(isValidAmountInput("199,901")).toBe(false);
    expect(isValidAmountInput("199.901")).toBe(false);
  });

  it("rejects thousand separators (kept out of the contract)", () => {
    // Ambiguous with decimals — user should type without thousand separators.
    expect(isValidAmountInput("1.234,56")).toBe(false);
    expect(isValidAmountInput("1,234.56")).toBe(false);
  });
});

describe("error message", () => {
  it("is in pt-BR with comma example", () => {
    expect(AMOUNT_ERROR_MESSAGE).toContain("vírgula");
    expect(AMOUNT_ERROR_MESSAGE).toContain("1234,56");
  });
});

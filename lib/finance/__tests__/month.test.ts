import { describe, expect, it } from "vitest";

import {
  currentMonthRef,
  fixedExpenseActiveInMonth,
  formatMonthLong,
  formatMonthShort,
  groupSum,
  isInMonth,
  isMonthRef,
  parcelSpansMonth,
  shiftMonth,
  subtractNumeric,
  sumNumeric,
  toMonthRef,
} from "../month";

describe("month refs", () => {
  it("validates month-ref shape", () => {
    expect(isMonthRef("2026-04")).toBe(true);
    expect(isMonthRef("2026-13")).toBe(false);
    expect(isMonthRef("2026-4")).toBe(false);
    expect(isMonthRef("abr/26")).toBe(false);
  });

  it("derives month ref from date", () => {
    expect(toMonthRef("2026-04-15")).toBe("2026-04");
    expect(toMonthRef(null)).toBe(null);
  });

  it("computes current month from injected date", () => {
    expect(currentMonthRef(new Date(2026, 3, 25))).toBe("2026-04");
  });

  it("shifts forward and backward across year boundary", () => {
    expect(shiftMonth("2026-01", -1)).toBe("2025-12");
    expect(shiftMonth("2026-12", 1)).toBe("2027-01");
    expect(shiftMonth("2026-04", 8)).toBe("2026-12");
    expect(shiftMonth("2026-04", -16)).toBe("2024-12");
  });

  it("formats labels", () => {
    expect(formatMonthShort("2026-04")).toBe("apr/26");
    expect(formatMonthLong("2026-04")).toBe("april 2026");
  });
});

describe("isInMonth", () => {
  it("matches dates within the same month", () => {
    expect(isInMonth("2026-04-01", "2026-04")).toBe(true);
    expect(isInMonth("2026-04-30", "2026-04")).toBe(true);
    expect(isInMonth("2026-05-01", "2026-04")).toBe(false);
  });
});

describe("parcelSpansMonth", () => {
  it("returns true when month is in [first, last]", () => {
    expect(parcelSpansMonth("2026-04-01", "2026-06-01", "2026-04")).toBe(true);
    expect(parcelSpansMonth("2026-04-01", "2026-06-01", "2026-05")).toBe(true);
    expect(parcelSpansMonth("2026-04-01", "2026-06-01", "2026-06")).toBe(true);
  });

  it("returns false outside the range", () => {
    expect(parcelSpansMonth("2026-04-01", "2026-06-01", "2026-03")).toBe(false);
    expect(parcelSpansMonth("2026-04-01", "2026-06-01", "2026-07")).toBe(false);
  });

  it("returns false when nullable boundaries are missing", () => {
    expect(parcelSpansMonth(null, "2026-06-01", "2026-04")).toBe(false);
    expect(parcelSpansMonth("2026-04-01", null, "2026-04")).toBe(false);
  });
});

describe("fixedExpenseActiveInMonth", () => {
  it("respects isActive flag", () => {
    expect(fixedExpenseActiveInMonth("2026-01-01", null, false, "2026-04")).toBe(false);
  });

  it("requires startDate <= month", () => {
    expect(fixedExpenseActiveInMonth("2026-04-01", null, true, "2026-03")).toBe(false);
    expect(fixedExpenseActiveInMonth("2026-04-01", null, true, "2026-04")).toBe(true);
  });

  it("excludes after endDate", () => {
    expect(fixedExpenseActiveInMonth("2026-01-01", "2026-03-31", true, "2026-04")).toBe(false);
    expect(fixedExpenseActiveInMonth("2026-01-01", "2026-04-30", true, "2026-04")).toBe(true);
  });

  it("treats null endDate as still active", () => {
    expect(fixedExpenseActiveInMonth("2026-01-01", null, true, "2030-12")).toBe(true);
  });
});

describe("sumNumeric / subtractNumeric", () => {
  it("sums numeric strings to two decimals", () => {
    expect(sumNumeric(["10.50", "5.25", "0.25"])).toBe("16.00");
    expect(sumNumeric([])).toBe("0.00");
  });

  it("subtracts numeric strings", () => {
    expect(subtractNumeric("100.00", "33.33")).toBe("66.67");
  });
});

describe("groupSum", () => {
  type Row = { id: string; amount: string; categoryId: string; categoryName: string };
  const rows: Row[] = [
    { id: "1", amount: "10.00", categoryId: "a", categoryName: "Alimentação" },
    { id: "2", amount: "20.00", categoryId: "b", categoryName: "Transporte" },
    { id: "3", amount: "5.00", categoryId: "a", categoryName: "Alimentação" },
  ];

  it("groups items by key and sums amounts", () => {
    const result = groupSum(
      rows,
      (r) => r.categoryId,
      (r) => r.amount,
      (r) => ({ label: r.categoryName }),
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({ key: "b", label: "Transporte", total: "20.00" });
    expect(result[1]).toMatchObject({ key: "a", label: "Alimentação", total: "15.00" });
  });

  it("returns empty array for empty input", () => {
    expect(
      groupSum<Row>(
        [],
        (r) => r.categoryId,
        (r) => r.amount,
        (r) => ({ label: r.categoryName }),
      ),
    ).toEqual([]);
  });
});

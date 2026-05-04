import { describe, expect, it } from "vitest";

import { isMoodLevel, moodFor, MOODS } from "../mood";

describe("mood scale", () => {
  it("has exactly five levels covering 1..5", () => {
    expect(MOODS).toHaveLength(5);
    expect(MOODS.map((m) => m.value)).toEqual([1, 2, 3, 4, 5]);
  });

  it("each descriptor has a non-empty label and an icon component", () => {
    for (const m of MOODS) {
      expect(m.label.length).toBeGreaterThan(0);
      expect(typeof m.icon).toBe("object");
    }
  });
});

describe("moodFor", () => {
  it("returns the descriptor for a valid level", () => {
    const r = moodFor(3);
    expect(r?.value).toBe(3);
    expect(r?.label).toBe("ameno");
  });

  it("returns null for null / undefined", () => {
    expect(moodFor(null)).toBeNull();
    expect(moodFor(undefined)).toBeNull();
  });

  it("returns null for out-of-range values", () => {
    expect(moodFor(0)).toBeNull();
    expect(moodFor(6)).toBeNull();
    expect(moodFor(-1)).toBeNull();
  });
});

describe("isMoodLevel", () => {
  it("accepts integers 1..5", () => {
    for (let i = 1; i <= 5; i++) expect(isMoodLevel(i)).toBe(true);
  });

  it("rejects everything else", () => {
    expect(isMoodLevel(0)).toBe(false);
    expect(isMoodLevel(6)).toBe(false);
    expect(isMoodLevel(2.5)).toBe(false);
    expect(isMoodLevel("3")).toBe(false);
    expect(isMoodLevel(null)).toBe(false);
    expect(isMoodLevel(undefined)).toBe(false);
  });
});

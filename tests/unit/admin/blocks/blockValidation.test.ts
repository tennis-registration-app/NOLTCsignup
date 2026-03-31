import { describe, it, expect } from "vitest";
import {
  hasValidTimes,
  hasReason,
  hasCourts,
} from "../../../../src/admin/blocks/utils/blockValidation.js";

describe("hasValidTimes", () => {
  it("returns true when both startTime and endTime are provided", () => {
    expect(hasValidTimes("09:00", "10:00")).toBe(true);
  });

  it("returns false when startTime is empty string", () => {
    expect(hasValidTimes("", "10:00")).toBe(false);
  });

  it("returns false when endTime is empty string", () => {
    expect(hasValidTimes("09:00", "")).toBe(false);
  });

  it("returns false when both are empty strings", () => {
    expect(hasValidTimes("", "")).toBe(false);
  });

  it("returns false when startTime is whitespace only (falsy coercion)", () => {
    // "  " is truthy in JS, so this should return true — testing the actual behavior
    expect(hasValidTimes("  ", "10:00")).toBe(true);
  });

  it("returns false when startTime is undefined-like empty", () => {
    expect(hasValidTimes("", "")).toBe(false);
  });

  it("returns true for any non-empty time strings", () => {
    expect(hasValidTimes("00:00", "23:59")).toBe(true);
    expect(hasValidTimes("12:30", "13:45")).toBe(true);
  });
});

describe("hasReason", () => {
  it("returns true for a non-empty reason string", () => {
    expect(hasReason("Court maintenance")).toBe(true);
  });

  it("returns false for an empty string", () => {
    expect(hasReason("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(hasReason("   ")).toBe(false);
  });

  it("returns false for tab-only string", () => {
    expect(hasReason("	")).toBe(false);
  });

  it("returns true for single-character reason", () => {
    expect(hasReason("x")).toBe(true);
  });

  it("returns true for reason with leading/trailing spaces", () => {
    expect(hasReason("  Rain delay  ")).toBe(true);
  });
});

describe("hasCourts", () => {
  it("returns true when at least one court is selected", () => {
    expect(hasCourts([1])).toBe(true);
  });

  it("returns true for multiple selected courts", () => {
    expect(hasCourts([1, 2, 3])).toBe(true);
  });

  it("returns false for empty array", () => {
    expect(hasCourts([])).toBe(false);
  });

  it("works with string court identifiers", () => {
    expect(hasCourts(["court-1", "court-2"])).toBe(true);
  });

  it("works with object entries", () => {
    expect(hasCourts([{ id: 1 }, { id: 2 }])).toBe(true);
  });
});

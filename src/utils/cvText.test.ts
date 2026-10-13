import { describe, expect, it } from "vitest";

import { isReadableCv, MIN_CV_CHARS } from "./cvText";

describe("isReadableCv", () => {
  it("needs MIN_CV_CHARS of real text", () => {
    expect(isReadableCv("x".repeat(MIN_CV_CHARS))).toBe(true);
    expect(isReadableCv("x".repeat(MIN_CV_CHARS - 1))).toBe(false);
  });

  it("ignores surrounding whitespace, so a blank PDF page does not count", () => {
    expect(isReadableCv("   \n \n  ".repeat(30))).toBe(false);
    expect(isReadableCv(`  ${"x".repeat(MIN_CV_CHARS)}  `)).toBe(true);
  });

  it("treats a missing text as unreadable", () => {
    expect(isReadableCv(null)).toBe(false);
    expect(isReadableCv(undefined)).toBe(false);
    expect(isReadableCv("")).toBe(false);
  });
});

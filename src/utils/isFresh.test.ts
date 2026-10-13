import { describe, expect, it } from "vitest";

import { isFresh } from "./isFresh";

const NOW = Date.parse("2026-10-13T12:00:00Z");
const hoursAgo = (h: number) => new Date(NOW - h * 3_600_000).toISOString();

describe("isFresh", () => {
  it("is true under 48 hours", () => {
    expect(isFresh(hoursAgo(1), NOW)).toBe(true);
    expect(isFresh(hoursAgo(47.9), NOW)).toBe(true);
  });

  it("is false from 48 hours on", () => {
    expect(isFresh(hoursAgo(48), NOW)).toBe(false);
    expect(isFresh(hoursAgo(24 * 5), NOW)).toBe(false);
  });

  it("is false without a usable date", () => {
    expect(isFresh(null, NOW)).toBe(false);
    expect(isFresh(undefined, NOW)).toBe(false);
    expect(isFresh("not a date", NOW)).toBe(false);
  });
});

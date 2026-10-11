import { describe, expect, it } from "vitest";

import { formatAgo } from "./relativeTime";

const NOW = Date.parse("2026-10-11T12:00:00Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

const en = (ms: number) => formatAgo(ago(ms), "en", "just now", NOW);

describe("formatAgo", () => {
  it("says 'just now' for the first minute and a half (translated by the caller)", () => {
    expect(en(0)).toBe("just now");
    expect(en(80_000)).toBe("just now");
    expect(formatAgo(ago(10_000), "fr", "à l'instant", NOW)).toBe("à l'instant");
  });

  it("uses minutes, hours, then days", () => {
    expect(en(2 * MIN)).toBe("2 minutes ago");
    expect(en(45 * MIN)).toBe("45 minutes ago");
    expect(en(3 * HOUR)).toBe("3 hours ago");
    expect(en(23 * HOUR)).toBe("23 hours ago");
    expect(en(2 * DAY)).toBe("2 days ago");
    expect(en(6 * DAY)).toBe("6 days ago");
  });

  it("says 'yesterday' for a day ago", () => {
    expect(en(30 * HOUR)).toBe("yesterday");
  });

  it("uses weeks, months and years for older offers", () => {
    expect(en(8 * DAY)).toBe("last week");
    expect(en(15 * DAY)).toBe("2 weeks ago");
    expect(en(45 * DAY)).toBe("last month");
    expect(en(120 * DAY)).toBe("4 months ago");
    expect(en(800 * DAY)).toBe("2 years ago");
  });

  it("is written in the requested language", () => {
    expect(formatAgo(ago(3 * DAY), "fr", "", NOW)).toBe("il y a 3 jours");
    expect(formatAgo(ago(3 * DAY), "he", "", NOW)).toMatch(/3/);
    expect(formatAgo(ago(3 * DAY), "he", "", NOW)).not.toBe(en(3 * DAY));
  });

  it("never shows a future date as negative: it reads as 'just now'", () => {
    expect(formatAgo(new Date(NOW + 5 * HOUR).toISOString(), "en", "just now", NOW)).toBe("just now");
  });

  it.each([null, undefined, "", "not a date"])("returns an empty string for %p", (value) => {
    expect(formatAgo(value, "en", "just now", NOW)).toBe("");
  });

  it("falls back to the current time when none is given", () => {
    expect(formatAgo(new Date().toISOString(), "en", "just now")).toBe("just now");
  });
});

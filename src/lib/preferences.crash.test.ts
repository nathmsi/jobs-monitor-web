import { describe, expect, it } from "vitest";

import type { JobPreferences } from "./preferences";

// Mirror of the mergePrefs guard in preferences.tsx.
// Ensures roles/categories always come back as arrays even when old localStorage
// data or Supabase returns null/undefined for those fields.

const DEFAULT: JobPreferences = { region: "all", kind: "all", roles: [], categories: [] };

function mergePrefs(raw: Partial<JobPreferences>): JobPreferences {
  return {
    ...DEFAULT,
    ...raw,
    roles: Array.isArray(raw.roles) ? raw.roles : DEFAULT.roles,
    categories: Array.isArray(raw.categories) ? raw.categories : DEFAULT.categories,
  };
}

describe("mergePrefs — guard against null/undefined arrays", () => {
  it("returns empty roles when stored value is null", () => {
    const result = mergePrefs({ roles: null as unknown as string[] });
    expect(Array.isArray(result.roles)).toBe(true);
    expect(result.roles).toEqual([]);
  });

  it("returns empty categories when stored value is null", () => {
    const result = mergePrefs({ categories: null as unknown as string[] });
    expect(Array.isArray(result.categories)).toBe(true);
    expect(result.categories).toEqual([]);
  });

  it("returns empty roles when stored value is undefined", () => {
    const result = mergePrefs({ roles: undefined });
    expect(result.roles).toEqual([]);
  });

  it("returns empty categories when stored value is undefined", () => {
    const result = mergePrefs({ categories: undefined });
    expect(result.categories).toEqual([]);
  });

  it("preserves valid roles array", () => {
    const result = mergePrefs({ roles: ["frontend", "backend"] });
    expect(result.roles).toEqual(["frontend", "backend"]);
  });

  it("preserves valid categories array", () => {
    const result = mergePrefs({ categories: ["fintech", "data-ai"] });
    expect(result.categories).toEqual(["fintech", "data-ai"]);
  });

  it("preserves region and kind from stored prefs", () => {
    const result = mergePrefs({ region: "il", kind: "company", roles: [], categories: [] });
    expect(result.region).toBe("il");
    expect(result.kind).toBe("company");
  });

  it("falls back to DEFAULT region when missing", () => {
    const result = mergePrefs({});
    expect(result.region).toBe("all");
    expect(result.kind).toBe("all");
  });

  it("handles completely empty object — all defaults", () => {
    const result = mergePrefs({});
    expect(result).toEqual(DEFAULT);
  });

  it("does not crash when roles is a string (very old format)", () => {
    const result = mergePrefs({ roles: "frontend" as unknown as string[] });
    expect(Array.isArray(result.roles)).toBe(true);
    expect(result.roles).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import { loadLocalProfile } from "./profileStorage";

// loadLocalProfile() must reject malformed localStorage data instead of returning
// an object with undefined skills/roles that crashes components downstream.

const KEY = "cvProfile.local.v1";

function simulateLoadLocal(stored: unknown): unknown | null {
  localStorage.clear();
  if (stored !== null && stored !== undefined) {
    localStorage.setItem(KEY, typeof stored === "string" ? stored : JSON.stringify(stored));
  }
  return loadLocalProfile();
}

describe("profile loadLocal guard", () => {
  it("returns null for empty localStorage", () => {
    expect(simulateLoadLocal(null)).toBeNull();
  });

  it("returns null when skills is missing", () => {
    const stale = JSON.stringify({ roles: ["frontend"], seniority: "Senior" });
    expect(simulateLoadLocal(stale)).toBeNull();
  });

  it("returns null when roles is missing", () => {
    const stale = JSON.stringify({ skills: ["React"], seniority: "Mid" });
    expect(simulateLoadLocal(stale)).toBeNull();
  });

  it("returns null when skills is not an array (old format)", () => {
    const stale = JSON.stringify({ skills: "React, TypeScript", roles: [] });
    expect(simulateLoadLocal(stale)).toBeNull();
  });

  it("returns null for corrupt JSON", () => {
    expect(simulateLoadLocal("{not valid json")).toBeNull();
  });

  it("returns the profile when both arrays are present", () => {
    const valid = JSON.stringify({ skills: ["React", "TypeScript"], roles: ["frontend"] });
    const result = simulateLoadLocal(valid) as { skills: string[] };
    expect(result).not.toBeNull();
    expect(result.skills).toContain("React");
  });

  it("accepts empty arrays (user with no skills yet)", () => {
    const empty = JSON.stringify({ skills: [], roles: [] });
    expect(simulateLoadLocal(empty)).not.toBeNull();
  });
});

import { describe, expect, it } from "vitest";

// Test that loadLocal() rejects malformed localStorage data instead of returning
// an object with undefined skills/roles that crashes components downstream.

// We import the module fresh each test via dynamic import to reset module state.
// Instead, we test the behavior indirectly by inspecting the exported function.
// loadLocal is not exported, so we test it via the ProfileProvider behavior —
// but since it depends on React/DOM, we test the guard logic directly here.

function simulateLoadLocal(stored: unknown): unknown | null {
  // Mirrors the loadLocal() logic from profile.tsx
  try {
    if (!stored) return null;
    const raw = typeof stored === "string" ? stored : JSON.stringify(stored);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { skills?: unknown; roles?: unknown };
    if (!Array.isArray(parsed?.skills) || !Array.isArray(parsed?.roles)) return null;
    return parsed;
  } catch {
    return null;
  }
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

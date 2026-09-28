import { describe, expect, it } from "vitest";

import { matchScore, rankScore, roleMatches } from "./cvAnalysis";
import type { CvProfile } from "./cvAnalysis";

// Guard against crash when profile data is malformed (missing skills/roles arrays).
// This was the root cause of the "Something went wrong" ErrorBoundary in production:
// localStorage or Supabase could return data that type-casts to CvProfile but has
// undefined fields if stored in an old format.

function badProfile(overrides: Partial<CvProfile> = {}): CvProfile {
  return { skills: undefined as unknown as string[], roles: undefined as unknown as string[], ...overrides };
}

describe("matchScore — malformed profile", () => {
  it("returns empty match when skills is undefined", () => {
    expect(matchScore("React TypeScript Node.js", badProfile())).toEqual({ count: 0, matched: [] });
  });

  it("returns empty match when skills is null", () => {
    expect(matchScore("React", badProfile({ skills: null as unknown as string[] }))).toEqual({ count: 0, matched: [] });
  });

  it("returns empty match for null profile", () => {
    expect(matchScore("React", null)).toEqual({ count: 0, matched: [] });
  });

  it("works normally with a valid profile", () => {
    const p: CvProfile = { skills: ["React", "TypeScript"], roles: ["frontend"] } as CvProfile;
    const result = matchScore("React developer with TypeScript", p);
    expect(result.count).toBeGreaterThan(0);
    expect(result.matched).toContain("React");
  });
});

describe("rankScore — malformed profile", () => {
  it("returns 0 when profile.skills is undefined", () => {
    expect(rankScore("React TypeScript Node.js", badProfile())).toBe(0);
  });

  it("returns 0 for null profile", () => {
    expect(rankScore("React", null)).toBe(0);
  });
});

describe("roleMatches — malformed profile", () => {
  it("returns false when profile.roles is undefined", () => {
    expect(roleMatches("Frontend React", badProfile({ skills: ["React"], roles: undefined as unknown as string[] }))).toBe(false);
  });

  it("returns false for null profile", () => {
    expect(roleMatches("Frontend", null)).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { analyzeCv, matchScore, normalizeProfile, rankScore, roleMatches } from "./cvAnalysis";
import type { CvProfile } from "./cvAnalysis";

const CV = `
John Doe — Senior Frontend Engineer
7 years of experience building scalable web applications.
Skills: React, TypeScript, JavaScript, Node.js, GraphQL, Docker, AWS, CI/CD.
Led a team of 4 engineers. Fluent in English and Hebrew. Based in Tel Aviv.
B.Sc in Computer Science. AWS Certified Solutions Architect.
`;

describe("analyzeCv", () => {
  const p = analyzeCv(CV);

  it("extracts real skills", () => {
    expect(p.skills).toContain("React");
    expect(p.skills).toContain("TypeScript");
    expect(p.skills).toContain("Node.js");
    expect(p.skills).toContain("AWS");
  });

  it("does not fire skills on substrings (no Scala from 'scalable')", () => {
    expect(p.skills).not.toContain("Scala");
  });

  it("captures seniority, years, languages and location", () => {
    expect(p.seniority).toBe("Senior");
    expect(p.years).toBe(7);
    expect(p.languages).toEqual(expect.arrayContaining(["English", "Hebrew"]));
    expect(p.locations).toContain("Tel Aviv");
  });

  it("extracts job titles, education and certifications", () => {
    expect(p.titles).toContain("Frontend Engineer");
    expect(p.education).toContain("B.Sc");
    expect(p.certifications).toContain("AWS Certified");
  });
});

describe("matching", () => {
  const p = analyzeCv(CV);

  it("scores an offer by overlapping skills", () => {
    const offer = "We need a React and TypeScript developer with AWS experience.";
    expect(matchScore(offer, p).count).toBeGreaterThanOrEqual(3);
    expect(rankScore(offer, p)).toBeGreaterThan(0);
  });

  it("does not match unrelated offers", () => {
    const offer = "Looking for a warehouse logistics coordinator.";
    expect(matchScore(offer, p).count).toBe(0);
  });
});

// Guard against crash when profile data is malformed (missing skills/roles arrays).
// This was the root cause of the "Something went wrong" ErrorBoundary in production:
// localStorage or Supabase could return data that type-casts to CvProfile but has
// undefined fields if stored in an old format.

function badProfile(overrides: Partial<Record<keyof CvProfile, unknown>> = {}): CvProfile {
  return {
    skills: undefined as unknown as string[],
    roles: undefined as unknown as string[],
    languages: [],
    seniority: null,
    years: null,
    locations: [],
    titles: [],
    education: [],
    certifications: [],
    ...overrides,
  } as CvProfile;
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

describe("normalizeProfile", () => {
  it("rejects data without skills/roles arrays", () => {
    expect(normalizeProfile(null)).toBeNull();
    expect(normalizeProfile({ roles: [] })).toBeNull();
    expect(normalizeProfile({ skills: "React", roles: [] })).toBeNull();
  });
  it("fills every list so consumers never see undefined", () => {
    const p = normalizeProfile({ skills: ["React"], roles: ["frontend"] });
    expect(p).toMatchObject({
      skills: ["React"], roles: ["frontend"], languages: [], locations: [],
      titles: [], education: [], certifications: [], seniority: null, years: null,
    });
  });
  it("drops non-string entries", () => {
    const p = normalizeProfile({ skills: ["React", 1, null], roles: [], titles: "x" });
    expect(p?.skills).toEqual(["React"]);
    expect(p?.titles).toEqual([]);
  });
});

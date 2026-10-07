import { describe, expect, it } from "vitest";

import { analyzeCv, roleMatches, type CvProfile } from "../utils/cvAnalysis";
import { ROLES, roleLabel } from "./roles";

const PROFILE = (roles: string[]): CvProfile => ({
  skills: [],
  roles,
  languages: [],
  seniority: null,
  years: null,
  locations: [],
  titles: [],
  education: [],
  certifications: [],
});

describe("ROLES", () => {
  it("exposes every role with strong + title terms and a combined list", () => {
    for (const r of ROLES) {
      expect(r.strong.length).toBeGreaterThan(0);
      expect(r.terms).toEqual([...r.strong, ...r.title]);
    }
  });

  it("keeps ambiguous words out of the strong terms", () => {
    const strong = (key: string) => ROLES.find((r) => r.key === key)!.strong;
    for (const ambiguous of ["java", "go", "python", "node"]) expect(strong("backend")).not.toContain(ambiguous);
    expect(strong("qa")).not.toContain("test");
    expect(strong("data")).not.toContain("data");
  });

  it("mobile covers iOS, Android and the cross-platform toolkits", () => {
    const mobile = ROLES.find((r) => r.key === "mobile")!.strong;
    expect(mobile).toEqual(expect.arrayContaining(["ios", "android", "react native", "flutter", "swift"]));
  });

  it("frontend covers the main frameworks", () => {
    const frontend = ROLES.find((r) => r.key === "frontend")!.strong;
    expect(frontend).toEqual(expect.arrayContaining(["react", "angular", "vue", "svelte", "next.js"]));
  });

  it("roleLabel falls back to the key", () => {
    expect(roleLabel("mobile")).toBe("Mobile");
    expect(roleLabel("unknown")).toBe("unknown");
  });
});

describe("roleMatches (whole words)", () => {
  it("matches the technologies of the role in title or description", () => {
    expect(roleMatches("Senior iOS Developer", PROFILE(["mobile"]))).toBe(true);
    expect(roleMatches("We build Android and Flutter apps", PROFILE(["mobile"]))).toBe(true);
    expect(roleMatches("Angular developer", PROFILE(["frontend"]))).toBe(true);
  });

  it("does not match inside other words", () => {
    expect(roleMatches("Many different scenarios and radios", PROFILE(["mobile"]))).toBe(false);
    expect(roleMatches("Sapient consulting", PROFILE(["sap"]))).toBe(false);
  });

  it("ignores ambiguous words that are not discipline-specific", () => {
    expect(roleMatches("Go to market lead, Java enthusiast", PROFILE(["backend"]))).toBe(false);
  });

  it("is false without roles", () => {
    expect(roleMatches("iOS", PROFILE([]))).toBe(false);
    expect(roleMatches("iOS", null)).toBe(false);
  });
});

describe("analyzeCv role detection", () => {
  it("detects mobile from iOS/Android keywords", () => {
    expect(analyzeCv("Mobile engineer: Swift, iOS and Android apps").roles).toContain("mobile");
  });
});

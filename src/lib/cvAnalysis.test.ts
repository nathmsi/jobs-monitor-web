import { describe, expect, it } from "vitest";

import { analyzeCv, matchScore, rankScore } from "./cvAnalysis";

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

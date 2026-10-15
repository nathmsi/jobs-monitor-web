import { describe, expect, it } from "vitest";

import type { CvProfile } from "./cvAnalysis";
import { MAX_SHARED_CV_CHARS, MAX_SHARED_CVS, toChatCvs, toChatProfile } from "./chatProfile";

const PROFILE: CvProfile = {
  skills: ["Node.js", "PostgreSQL"], roles: ["backend"], languages: ["English"], seniority: "Senior", years: 6,
  locations: ["Tel Aviv"], titles: ["Backend Engineer"], education: ["B.Sc"], certifications: ["AWS"],
};

describe("toChatProfile", () => {
  it("keeps what the assistant searches with, and leaves education and certifications out", () => {
    expect(toChatProfile(PROFILE)).toEqual({
      skills: ["Node.js", "PostgreSQL"], roles: ["backend"], languages: ["English"], locations: ["Tel Aviv"],
      titles: ["Backend Engineer"], seniority: "Senior", years: 6,
    });
  });

  it("is null without a profile, or one with nothing to search on", () => {
    expect(toChatProfile(null)).toBeNull();
    expect(toChatProfile({ ...PROFILE, skills: [], roles: [], titles: [] })).toBeNull();
  });

  it("cuts to the limits the API enforces, drops empties and duplicates", () => {
    const out = toChatProfile({ ...PROFILE, skills: ["A", "A", "  ", ...Array.from({ length: 80 }, (_, i) => `s${i}`)], seniority: "x".repeat(99), years: 200 })!;
    expect(out.skills).toHaveLength(40);
    expect(new Set(out.skills).size).toBe(40);
    expect(out.seniority).toHaveLength(30);
    expect(out.years).toBe(60);
  });

  it("turns an unknown number of years or seniority into null", () => {
    const out = toChatProfile({ ...PROFILE, seniority: null, years: null })!;
    expect(out.seniority).toBeNull();
    expect(out.years).toBeNull();
  });
});

describe("toChatCvs", () => {
  const cv = (id: string, text: string) => ({ id, name: `${id}.pdf`, text });
  const READABLE = "Senior Backend Engineer with Node.js and PostgreSQL. ".repeat(3);

  it("shares readable CVs with their name and text", () => {
    expect(toChatCvs([cv("a", READABLE)])).toEqual([{ id: "a", name: "a.pdf", text: READABLE.trim() }]);
  });

  it("skips a CV with no usable text", () => {
    expect(toChatCvs([cv("a", ""), cv("b", "too short"), cv("c", READABLE)]).map((c) => c.id)).toEqual(["c"]);
  });

  it("keeps at most 3 CVs, each cut to 12 000 characters", () => {
    const out = toChatCvs(Array.from({ length: 5 }, (_, i) => cv(`c${i}`, "x".repeat(MAX_SHARED_CV_CHARS + 900))));
    expect(out).toHaveLength(MAX_SHARED_CVS);
    expect(out[0].text).toHaveLength(MAX_SHARED_CV_CHARS);
  });
});

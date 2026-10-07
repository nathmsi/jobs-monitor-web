import { describe, expect, it } from "vitest";

import { normalizeProfile } from "./cvAnalysis";
import { errorMessage } from "./errorMessage";
import { jobText } from "./jobText";
import { mergePrefs } from "./preferences";
import { regionLabel } from "./regionLabel";

describe("jobText", () => {
  it("joins title, excerpt and description", () => {
    expect(jobText({ title: "Dev", excerpt: "ex", description: "desc" })).toBe("Dev ex desc");
  });
  it("tolerates a missing description", () => {
    expect(jobText({ title: "Dev", excerpt: "ex" }).trim()).toBe("Dev ex");
  });
});

describe("regionLabel", () => {
  const r = { key: "tlv", label_en: "Tel Aviv", label_he: "תל אביב", label_fr: "Tel-Aviv" };
  it("picks the label of the active language", () => {
    expect(regionLabel(r, "he")).toBe("תל אביב");
    expect(regionLabel(r, "fr-FR")).toBe("Tel-Aviv");
    expect(regionLabel(r, "en")).toBe("Tel Aviv");
  });
  it("falls back to English when French is missing", () => {
    expect(regionLabel({ ...r, label_fr: undefined }, "fr")).toBe("Tel Aviv");
  });
});

describe("errorMessage", () => {
  it("handles Error and non-Error values", () => {
    expect(errorMessage(new Error("x"))).toBe("x");
    expect(errorMessage("plain")).toBe("plain");
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

describe("mergePrefs (real implementation)", () => {
  it("coerces null/invalid lists to empty arrays", () => {
    const m = mergePrefs({
      roles: null as unknown as string[],
      categories: "x" as unknown as string[],
    });
    expect(m.roles).toEqual([]);
    expect(m.categories).toEqual([]);
    expect(m.region).toBe("all");
  });
});

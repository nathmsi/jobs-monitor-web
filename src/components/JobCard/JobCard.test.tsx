import { describe, expect, it } from "vitest";

import { parseAiSummary, type AiInfo } from "../../lib/aiSummary";

const validSummary: AiInfo = {
  headline: "Senior React Developer · Acme",
  stack: ["React", "TypeScript", "Node.js"],
  level: "Senior",
  remote: "Hybrid",
  highlights: ["Startup", "Remote-friendly"],
};

describe("parseAiSummary (JobCard)", () => {
  it("returns null for undefined input", () => {
    expect(parseAiSummary(undefined)).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(parseAiSummary("")).toBeNull();
  });

  it("returns null for invalid JSON", () => {
    expect(parseAiSummary("{not valid json}")).toBeNull();
  });

  it("returns null when headline is missing", () => {
    expect(parseAiSummary(JSON.stringify({ stack: ["React"] }))).toBeNull();
  });

  it("returns null when stack is missing", () => {
    expect(parseAiSummary(JSON.stringify({ headline: "Dev" }))).toBeNull();
  });

  it("parses a valid AI summary", () => {
    const result = parseAiSummary(JSON.stringify(validSummary));
    expect(result).not.toBeNull();
    expect(result?.headline).toBe("Senior React Developer · Acme");
    expect(result?.stack).toEqual(["React", "TypeScript", "Node.js"]);
    expect(result?.level).toBe("Senior");
    expect(result?.remote).toBe("Hybrid");
    expect(result?.highlights).toContain("Startup");
  });

  it("normalises missing optional fields instead of leaving them undefined", () => {
    const result = parseAiSummary(JSON.stringify({ headline: "Dev", stack: ["Go"] }));
    expect(result).toEqual({ headline: "Dev", stack: ["Go"], level: "", remote: "", highlights: [] });
  });

  it("drops non-string entries and non-array highlights", () => {
    const result = parseAiSummary(
      JSON.stringify({ headline: "Dev", stack: ["Go", 3, null], highlights: "oops" }),
    );
    expect(result?.stack).toEqual(["Go"]);
    expect(result?.highlights).toEqual([]);
  });

  it("returns null for JSON that is not an object", () => {
    expect(parseAiSummary("null")).toBeNull();
    expect(parseAiSummary("42")).toBeNull();
  });

  it("parses with empty highlights array", () => {
    const summary = { ...validSummary, highlights: [] };
    const result = parseAiSummary(JSON.stringify(summary));
    expect(result?.highlights).toEqual([]);
  });

  it("parses with empty stack array — returns object ([] is truthy)", () => {
    const summary = { ...validSummary, stack: [] };
    const result = parseAiSummary(JSON.stringify(summary));
    // empty array is truthy, so the check passes and the object is returned
    expect(result).not.toBeNull();
    expect(result?.stack).toEqual([]);
  });
});

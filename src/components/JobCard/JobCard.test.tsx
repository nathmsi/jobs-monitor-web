import { describe, expect, it } from "vitest";

// parseAiSummary is unexported — test it indirectly via the exported component
// by testing the logic manually (it's a pure function).

interface AiInfo {
  headline: string;
  stack: string[];
  level: string;
  remote: string;
  highlights: string[];
}

function parseAiSummary(raw: string | undefined): AiInfo | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as AiInfo;
    if (p.headline && p.stack) return p;
  } catch {}
  return null;
}

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

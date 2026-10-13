import { describe, expect, it } from "vitest";

import type { MatchStep } from "../../hooks/useMatchRun";
import { currentPhase, describeStep } from "./agentPhases";

const step = (name: string, status: MatchStep["status"] = "running", input: unknown = {}): MatchStep => ({
  id: `${name}-${Math.random()}`,
  name,
  input,
  status,
});

describe("currentPhase", () => {
  it("starts by reading the CV", () => {
    expect(currentPhase([])).toBe("profile");
  });

  it("is searching while any search runs, even if another already finished", () => {
    expect(currentPhase([step("search_offers", "done"), step("search_offers", "running")])).toBe("search");
    expect(currentPhase([step("search_and_read_top")])).toBe("search");
    expect(currentPhase([step("market_stats")])).toBe("search");
  });

  it("is comparing when only reads run, and while the agent weighs what it found", () => {
    expect(currentPhase([step("search_offers", "done"), step("read_offer", "running")])).toBe("compare");
    expect(currentPhase([step("search_offers", "done"), step("search_offers", "done")])).toBe("compare");
  });

  it("is ranking once an offer was read and nothing runs", () => {
    expect(currentPhase([step("search_offers", "done"), step("read_offer", "done")])).toBe("rank");
    expect(currentPhase([step("read_offer", "failed")])).toBe("rank");
  });

  it("goes back to searching if the agent searches again after reading", () => {
    expect(currentPhase([step("read_offer", "done"), step("search_offers", "running")])).toBe("search");
  });
});

describe("describeStep", () => {
  it("names what an agent search looks for: role first, then up to 3 skills", () => {
    expect(describeStep({ name: "search_offers", input: { role: "Backend Engineer", skills: ["Node.js", "TS", "Go", "AWS"] } })).toEqual({
      key: "search",
      values: { what: "Backend Engineer · Node.js, TS, Go" },
    });
    expect(describeStep({ name: "search_offers", input: { skills: ["Node.js"] } }).values).toEqual({ what: "Node.js" });
  });

  it("falls back to a generic sentence when the search has no readable target", () => {
    expect(describeStep({ name: "search_offers", input: {} }).key).toBe("searchAny");
    expect(describeStep({ name: "search_offers", input: null }).key).toBe("searchAny");
    expect(describeStep({ name: "search_offers", input: { skills: [1, 2] } }).key).toBe("searchAny");
  });

  it("describes search-and-read, read, stats and unknown tools", () => {
    expect(describeStep({ name: "search_and_read_top", input: { role: "Dev" } })).toEqual({ key: "searchRead", values: { what: "Dev" } });
    expect(describeStep({ name: "search_and_read_top", input: {} }).key).toBe("searchReadAny");
    expect(describeStep({ name: "read_offer", input: { id: "a__1" } }).key).toBe("read");
    expect(describeStep({ name: "market_stats", input: { role: "react" } })).toEqual({ key: "stats", values: { what: "react" } });
    expect(describeStep({ name: "mystery", input: {} })).toEqual({ key: "other", values: { name: "mystery" } });
  });

  it("describes the no-agent pipeline by the counts it reports", () => {
    expect(describeStep({ name: "search_offers", input: { skills: 9 } })).toEqual({ key: "scoring", values: { count: 9 } });
    expect(describeStep({ name: "read_offer", input: { offers: 40 } })).toEqual({ key: "ranking", values: { count: 40 } });
  });
});

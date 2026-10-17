import { describe, expect, it } from "vitest";

import { matchesAnyRole } from "./matchesRole";

const job = (title: string, description = "") => ({ title, excerpt: "", description });

describe("matchesAnyRole", () => {
  it("a strong term counts in the title or in the description", () => {
    expect(matchesAnyRole(job("Engineer", "We build with React every day"), "frontend")).toBe(true);
    expect(matchesAnyRole(job("React Engineer"), "frontend")).toBe(true);
  });

  it("an ambiguous term counts in the title only", () => {
    expect(matchesAnyRole(job("Java Developer"), "backend")).toBe(true);
    expect(matchesAnyRole(job("Engineer", "some java here"), "backend")).toBe(false);
  });

  it("matches whole words only", () => {
    expect(matchesAnyRole(job("Scenarios Analyst"), "mobile")).toBe(false);
    expect(matchesAnyRole(job("iOS Developer"), "mobile")).toBe(true);
  });

  it("any of several roles matches; an unknown role matches nothing", () => {
    expect(matchesAnyRole(job("iOS Developer"), "frontend,mobile")).toBe(true);
    expect(matchesAnyRole(job("iOS Developer"), "astronaut")).toBe(false);
  });
});

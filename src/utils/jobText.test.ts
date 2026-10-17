import { describe, expect, it } from "vitest";

import { jobText } from "./jobText";

describe("jobText", () => {
  it("joins title, excerpt and description", () => {
    expect(jobText({ title: "Dev", excerpt: "ex", description: "desc" })).toBe("Dev ex desc");
  });
  it("tolerates a missing description", () => {
    expect(jobText({ title: "Dev", excerpt: "ex" }).trim()).toBe("Dev ex");
  });
});

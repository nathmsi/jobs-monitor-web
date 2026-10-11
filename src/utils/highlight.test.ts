import { describe, expect, it } from "vitest";

import { highlightParts } from "./highlight";

describe("highlightParts", () => {
  it("splits around the first match, keeping the label's own casing", () => {
    expect(highlightParts("React Native", "rea")).toEqual({ before: "", match: "Rea", after: "ct Native" });
    expect(highlightParts("Tel Aviv", "AVIV")).toEqual({ before: "Tel ", match: "Aviv", after: "" });
  });

  it("highlights only the first occurrence", () => {
    expect(highlightParts("ababab", "ab")).toEqual({ before: "", match: "ab", after: "abab" });
  });

  it("returns the whole label when nothing matches or nothing was typed", () => {
    expect(highlightParts("React", "vue")).toEqual({ before: "React", match: "", after: "" });
    expect(highlightParts("React", "   ")).toEqual({ before: "React", match: "", after: "" });
  });

  it("copes with symbols in names", () => {
    expect(highlightParts("C#", "c#")).toEqual({ before: "", match: "C#", after: "" });
    expect(highlightParts("Node.js", ".js")).toEqual({ before: "Node", match: ".js", after: "" });
  });
});

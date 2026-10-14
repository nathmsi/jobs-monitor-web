import { describe, expect, it } from "vitest";

import { descriptionBlocks, isShortened } from "./descriptionBlocks";

describe("descriptionBlocks", () => {
  it("returns nothing for empty text", () => {
    expect(descriptionBlocks("")).toEqual([]);
    expect(descriptionBlocks("   ")).toEqual([]);
  });

  it("turns known section titles into headings", () => {
    const blocks = descriptionBlocks(
      "About the Role We build things. You will ship them. Requirements: Five years of React. Nice to Have Go.",
    );
    expect(blocks.map((b) => b.type)).toEqual(["heading", "paragraph", "heading", "paragraph", "heading", "paragraph"]);
    expect(blocks[0]).toEqual({ type: "heading", text: "About the Role" });
    expect(blocks[2]).toEqual({ type: "heading", text: "Requirements" });
    expect(blocks[4]).toEqual({ type: "heading", text: "Nice to Have" });
  });

  it("does not treat a title in the middle of a sentence as a heading", () => {
    const blocks = descriptionBlocks("We value Requirements engineering and the Role of testing in our team.");
    expect(blocks.every((b) => b.type === "paragraph")).toBe(true);
  });

  it("cuts a long run of sentences into short paragraphs", () => {
    const sentence = "This is one sentence about the work. ";
    const blocks = descriptionBlocks(sentence.repeat(7));
    expect(blocks.length).toBeGreaterThan(1);
    expect(blocks.every((b) => b.type === "paragraph" && b.text.length < 420)).toBe(true);
  });

  it("keeps existing line breaks as paragraph breaks", () => {
    const blocks = descriptionBlocks("First part.\nSecond part.");
    expect(blocks).toEqual([
      { type: "paragraph", text: "First part." },
      { type: "paragraph", text: "Second part." },
    ]);
  });

  it("handles Hebrew text", () => {
    const blocks = descriptionBlocks("אנחנו מחפשים מפתח. התפקיד כולל עבודה בצוות. נדרש ניסיון של שלוש שנים.");
    expect(blocks.length).toBeGreaterThan(0);
    expect(blocks.map((b) => (b.type === "paragraph" ? b.text : "")).join(" ")).toContain("נדרש ניסיון");
  });
});

describe("isShortened", () => {
  it("flags text that reached the storage limit", () => {
    expect(isShortened("x".repeat(1200))).toBe(true);
    expect(isShortened("x".repeat(300))).toBe(false);
  });
});

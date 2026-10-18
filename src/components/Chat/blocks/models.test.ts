import { describe, expect, it } from "vitest";

import { makeJob } from "../../../test/factories";
import { BLOCK_MODELS, isStoredBlock, isTransientBlock, parseBlocks, summarizeBlocks } from "./models";
import { BLOCK_VIEWS } from "./views";

const job = makeJob({ external_id: "1", title: "Dev" });

describe("the registries", () => {
  it("have a model and a view for the same kinds (the compiler checks it too)", () => {
    expect(Object.keys(BLOCK_VIEWS).sort()).toEqual(Object.keys(BLOCK_MODELS).sort());
  });
});

describe("parseBlocks", () => {
  it("reads the blocks in the order the API sent them", () => {
    const blocks = parseBlocks([
      { type: "suggestions", replies: ["More"] },
      { type: "offers", offers: [job] },
      { type: "links", links: [{ path: "/coach", label: "CV" }] },
    ]);
    expect(blocks.map((b) => b.type)).toEqual(["suggestions", "offers", "links"]);
  });

  it("skips a kind it does not know (an API newer than this client), and a broken block, but keeps the rest", () => {
    const blocks = parseBlocks([{ type: "map", points: [] }, { type: "offers" }, { type: 5 }, "x", null, { type: "links", links: [{ path: "/jobs", label: "Offers" }] }]);
    expect(blocks.map((b) => b.type)).toEqual(["links"]);
  });

  it("does not read a kind through the prototype", () => {
    expect(parseBlocks([{ type: "constructor" }, { type: "__proto__" }, { type: "toString" }])).toEqual([]);
  });

  it.each([null, undefined, "x", 42, {}])("is empty for %p", (raw) => {
    expect(parseBlocks(raw)).toEqual([]);
  });
});

describe("summarizeBlocks", () => {
  it("says what was shown, for the kinds that have a note, and nothing for the others", () => {
    const blocks = parseBlocks([{ type: "offers", offers: [job] }, { type: "suggestions", replies: ["More"] }]);
    expect(summarizeBlocks(blocks)).toBe("[Showed 1 offers]");
    expect(summarizeBlocks([])).toBe("");
  });
});

describe("isTransientBlock", () => {
  it("is true only for quick replies", () => {
    const [offers, links, suggestions] = parseBlocks([
      { type: "offers", offers: [job] },
      { type: "links", links: [{ path: "/jobs", label: "x" }] },
      { type: "suggestions", replies: ["x"] },
    ]);
    expect([offers, links, suggestions].map(isTransientBlock)).toEqual([false, false, true]);
  });
});

describe("isStoredBlock", () => {
  it("recognises a block of a known kind", () => {
    expect(isStoredBlock({ type: "offers", offers: [] })).toBe(true);
    expect(isStoredBlock({ type: "hologram" })).toBe(false);
    expect(isStoredBlock(null)).toBe(false);
    expect(isStoredBlock("offers")).toBe(false);
  });
});

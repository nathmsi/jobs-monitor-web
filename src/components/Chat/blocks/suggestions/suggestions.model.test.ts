import { describe, expect, it } from "vitest";

import { suggestionsModel } from "./suggestions.model";

describe("suggestionsModel", () => {
  it("turns each reply into a button that sends it", () => {
    expect(suggestionsModel.parse({ replies: ["Backend", "Frontend"] })).toEqual({
      type: "suggestions",
      buttons: [
        { label: "Backend", action: { type: "send", text: "Backend" } },
        { label: "Frontend", action: { type: "send", text: "Frontend" } },
      ],
    });
  });

  it("trims, drops empty and repeated replies, and gives nothing when none is left", () => {
    expect(suggestionsModel.parse({ replies: [" A ", "A", "", "  ", 7, "B"] })?.buttons.map((b) => b.label)).toEqual(["A", "B"]);
    expect(suggestionsModel.parse({ replies: ["", " "] })).toBeNull();
  });

  it.each([null, undefined, "x", [], {}, { replies: "no" }])("never throws on %p", (raw) => {
    expect(suggestionsModel.parse(raw)).toBeNull();
  });

  it("is transient: quick replies only make sense under the latest answer", () => {
    expect(suggestionsModel.transient).toBe(true);
  });
});

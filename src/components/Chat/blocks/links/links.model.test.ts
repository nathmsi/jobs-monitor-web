import { describe, expect, it } from "vitest";

import { linksModel } from "./links.model";

describe("linksModel", () => {
  it("turns each link into a button that navigates", () => {
    expect(linksModel.parse({ links: [{ path: "/jobs?region=jerusalem", label: "Jerusalem" }] })).toEqual({
      type: "links",
      buttons: [{ label: "Jerusalem", action: { type: "navigate", path: "/jobs?region=jerusalem" } }],
    });
  });

  it("never lets a button leave the site", () => {
    const block = linksModel.parse({
      links: [
        { path: "https://evil.example", label: "Win" },
        { path: "//evil.example", label: "Win" },
        { path: "javascript:alert(1)", label: "Win" },
        { path: "/coach", label: "CV" },
      ],
    });
    expect(block?.buttons.map((b) => b.label)).toEqual(["CV"]);
  });

  it("skips a link without a label or a path, and gives nothing when none is left", () => {
    expect(linksModel.parse({ links: [{ path: "/coach", label: "  " }, { path: "/coach" }, { label: "x" }, null] })).toBeNull();
  });

  it.each([null, undefined, "x", [], {}, { links: "no" }])("never throws on %p", (raw) => {
    expect(linksModel.parse(raw)).toBeNull();
  });

  it("is not transient and has no note: it stays under its answer", () => {
    expect(linksModel.transient).toBeFalsy();
    expect(linksModel.summary).toBeUndefined();
  });
});

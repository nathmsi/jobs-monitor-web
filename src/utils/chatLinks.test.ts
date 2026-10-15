import { describe, expect, it } from "vitest";

import { internalLinks, isInternalPath } from "./chatLinks";

describe("isInternalPath", () => {
  it.each(["/", "/jobs", "/jobs?region=jerusalem&role=backend", "/coach"])("follows %s", (path) => {
    expect(isInternalPath(path)).toBe(true);
  });

  it.each(["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "jobs", "", "/javascript:alert(1)"])(
    "refuses %s",
    (path) => {
      expect(isInternalPath(path)).toBe(false);
    },
  );
});

describe("internalLinks", () => {
  it("keeps the links that stay on the site and have a label", () => {
    expect(
      internalLinks([
        { path: "/jobs", label: "Offers" },
        { path: "https://evil.example", label: "Win a prize" },
        { path: "/coach", label: "  " },
      ]),
    ).toEqual([{ path: "/jobs", label: "Offers" }]);
  });

  it("accepts a missing list", () => {
    expect(internalLinks(undefined)).toEqual([]);
  });
});

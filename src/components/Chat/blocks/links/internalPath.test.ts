import { describe, expect, it } from "vitest";

import { isInternalPath } from "./internalPath";

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

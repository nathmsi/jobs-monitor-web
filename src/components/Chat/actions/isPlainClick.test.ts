import { describe, expect, it } from "vitest";

import { isPlainClick } from "./isPlainClick";

const click = (over = {}) => ({ button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, defaultPrevented: false, ...over });

describe("isPlainClick", () => {
  it("is a left click with no key held", () => {
    expect(isPlainClick(click())).toBe(true);
  });

  it.each([{ metaKey: true }, { ctrlKey: true }, { shiftKey: true }, { altKey: true }, { button: 1 }, { button: 2 }, { defaultPrevented: true }])(
    "is not %j",
    (over) => {
      expect(isPlainClick(click(over))).toBe(false);
    },
  );
});

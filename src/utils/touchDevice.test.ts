import { afterEach, describe, expect, it, vi } from "vitest";

import { isTouchDevice, keyboardIsOpen, KEYBOARD_MIN_HEIGHT } from "./touchDevice";

afterEach(() => vi.unstubAllGlobals());

const media = (matches: (query: string) => boolean) => vi.stubGlobal("matchMedia", (query: string) => ({ matches: matches(query), media: query }));

describe("isTouchDevice", () => {
  it("is true when the main pointer is coarse (a finger)", () => {
    media((q) => q.includes("pointer: coarse"));
    expect(isTouchDevice()).toBe(true);
  });

  it("is false with a mouse", () => {
    media(() => false);
    expect(isTouchDevice()).toBe(false);
  });
});

describe("keyboardIsOpen", () => {
  it("is open when a good part of the window is hidden", () => {
    expect(keyboardIsOpen(800, 420)).toBe(true);
  });

  it("is closed when the visible area is about the window (browser bars come and go)", () => {
    expect(keyboardIsOpen(800, 800)).toBe(false);
    expect(keyboardIsOpen(800, 800 - KEYBOARD_MIN_HEIGHT)).toBe(false);
    expect(keyboardIsOpen(800, 800 - KEYBOARD_MIN_HEIGHT - 1)).toBe(true);
  });
});

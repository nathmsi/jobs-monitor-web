import { describe, expect, it } from "vitest";

import { avatarColor, initials } from "./avatar";

describe("avatarColor", () => {
  it("is deterministic and always returns a hex colour", () => {
    expect(avatarColor("melio")).toBe(avatarColor("melio"));
    expect(avatarColor("melio")).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it("spreads different keys over the palette", () => {
    const colours = new Set(["a", "bb", "ccc", "dddd", "eeeee", "ffffff", "ggggggg"].map(avatarColor));
    expect(colours.size).toBeGreaterThan(1);
  });
});

describe("initials", () => {
  it("returns uppercase initials", () => {
    expect(initials("monday.com").length).toBeGreaterThan(0);
    expect(initials("monday.com")).toBe(initials("monday.com").toUpperCase());
  });

  it("never throws on empty or odd labels", () => {
    expect(() => initials("")).not.toThrow();
    expect(() => initials("  ")).not.toThrow();
    expect(() => initials("עברית")).not.toThrow();
  });
});

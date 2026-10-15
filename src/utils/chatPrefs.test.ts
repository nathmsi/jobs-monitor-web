import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PREFS, loadChatPrefs, saveChatPrefs } from "./chatPrefs";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("chatPrefs", () => {
  it("starts compact, and not sharing the CV", () => {
    expect(loadChatPrefs()).toEqual({ size: "compact", share: false });
  });

  it("remembers the choices", () => {
    saveChatPrefs({ size: "large", share: true });
    expect(loadChatPrefs()).toEqual({ size: "large", share: true });
  });

  it("ignores a corrupted or unexpected value", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", "{nope");
    expect(loadChatPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ size: "huge", share: "yes" }));
    expect(loadChatPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem("jobs-monitor.chat.prefs", "42");
    expect(loadChatPrefs()).toEqual(DEFAULT_PREFS);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadChatPrefs()).toEqual(DEFAULT_PREFS);
    expect(() => saveChatPrefs({ size: "large", share: true })).not.toThrow();
  });
});

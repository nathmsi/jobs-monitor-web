import { afterEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_PREFS, loadChatPrefs, saveChatPrefs } from "./chatPrefs";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("chatPrefs", () => {
  it("starts at the default place, and not sharing the CV", () => {
    expect(loadChatPrefs()).toEqual({ frame: null, share: false });
  });

  it("remembers the choices", () => {
    const frame = { left: 300, top: 120, width: 700, height: 600 };
    saveChatPrefs({ frame, share: true });
    expect(loadChatPrefs()).toEqual({ frame, share: true });
  });

  it("drops a window position that is not four numbers, but keeps the other choice", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ frame: { left: 1, top: 2, width: "wide", height: 4 }, share: true }));
    expect(loadChatPrefs()).toEqual({ frame: null, share: true });
  });

  it("ignores a corrupted or unexpected value", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", "{nope");
    expect(loadChatPrefs()).toEqual(DEFAULT_PREFS);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ frame: { left: "x" }, share: "yes" }));
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
    expect(() => saveChatPrefs({ frame: null, share: true })).not.toThrow();
  });
});

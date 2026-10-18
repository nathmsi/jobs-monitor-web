import { afterEach, describe, expect, it, vi } from "vitest";

import { DOCK_DEFAULT_WIDTH, DOCK_MAX_WIDTH, DOCK_MIN_WIDTH } from "./chatFrame";
import { DEFAULT_PREFS, loadChatPrefs, saveChatPrefs } from "./chatPrefs";

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe("chatPrefs", () => {
  it("starts docked to the side, and not sharing the CV", () => {
    expect(loadChatPrefs()).toEqual({ frame: null, share: false, dock: true, dockWidth: DOCK_DEFAULT_WIDTH });
  });

  it("remembers the choices", () => {
    const frame = { left: 300, top: 120, width: 700, height: 600 };
    saveChatPrefs({ frame, share: true, dock: false, dockWidth: 500 });
    expect(loadChatPrefs()).toEqual({ frame, share: true, dock: false, dockWidth: 500 });
  });

  it("drops a window position that is not four numbers, but keeps the other choice", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ frame: { left: 1, top: 2, width: "wide", height: 4 }, share: true }));
    expect(loadChatPrefs()).toEqual({ ...DEFAULT_PREFS, share: true });
  });

  it("keeps the dock width between a usable chat and the most it may take", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ dock: true, dockWidth: 50 }));
    expect(loadChatPrefs().dockWidth).toBe(DOCK_MIN_WIDTH);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ dock: true, dockWidth: 5000 }));
    expect(loadChatPrefs().dockWidth).toBe(DOCK_MAX_WIDTH);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ dock: true, dockWidth: "wide" }));
    expect(loadChatPrefs().dockWidth).toBe(DOCK_DEFAULT_WIDTH);
  });

  it("a user who pulled it off stays detached; a stored value that is not a boolean means the default", () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ dock: false }));
    expect(loadChatPrefs().dock).toBe(false);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ dock: "yes" }));
    expect(loadChatPrefs().dock).toBe(true);
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ share: true })); // from before the dock existed
    expect(loadChatPrefs().dock).toBe(true);
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
    expect(() => saveChatPrefs({ ...DEFAULT_PREFS, share: true })).not.toThrow();
  });
});

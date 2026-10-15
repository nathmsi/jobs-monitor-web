import { afterEach, describe, expect, it, vi } from "vitest";

import type { ChatItem } from "./chatMessages";
import { loadChat, saveChat } from "./chatStorage";

const item = (n: number): ChatItem => ({ id: `i${n}`, role: n % 2 ? "assistant" : "user", content: `m${n}` });

afterEach(() => {
  sessionStorage.clear();
  vi.restoreAllMocks();
});

describe("chatStorage", () => {
  it("restores what was saved", () => {
    saveChat([item(0), item(1)]);
    expect(loadChat()).toEqual([item(0), item(1)]);
  });

  it("is empty when nothing was saved", () => {
    expect(loadChat()).toEqual([]);
  });

  it("forgets an empty conversation", () => {
    saveChat([item(0)]);
    saveChat([]);
    expect(sessionStorage.getItem("jobs-monitor.chat")).toBeNull();
  });

  it("keeps only the 40 latest items", () => {
    saveChat(Array.from({ length: 60 }, (_, i) => item(i)));
    const stored = loadChat();
    expect(stored).toHaveLength(40);
    expect(stored[0].id).toBe("i20");
  });

  it("ignores corrupted or malformed data", () => {
    sessionStorage.setItem("jobs-monitor.chat", "{not json");
    expect(loadChat()).toEqual([]);
    sessionStorage.setItem("jobs-monitor.chat", JSON.stringify([item(0), { id: 1 }, "x", { id: "z", role: "system", content: "x" }]));
    expect(loadChat()).toEqual([item(0)]);
  });

  it("does not throw when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(loadChat()).toEqual([]);
    expect(() => saveChat([item(0)])).not.toThrow();
  });
});

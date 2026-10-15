import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../api/chat";
import type { ChatEvent } from "../api/chat";
import "../i18n";
import { makeJob } from "../test/factories";
import { useChat } from "./useChat";

function events(...list: ChatEvent[]) {
  return vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
    for (const e of list) yield e;
  });
}

const reply = (text: string, extra: Partial<Extract<ChatEvent, { type: "final" }>["reply"]> = {}): ChatEvent => ({
  type: "final",
  reply: { text, offers: [], links: [], suggestions: [], ...extra },
});

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useChat", () => {
  it("starts empty and idle", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current).toMatchObject({ items: [], status: "idle", step: null });
  });

  it("sends the question with the language and shows the reply", async () => {
    const spy = events(reply("Which role?", { suggestions: ["Backend"] }));
    const { result } = renderHook(() => useChat());

    act(() => result.current.send("  I need a job  "));
    expect(result.current.status).toBe("thinking");

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(spy.mock.calls[0][0]).toEqual([{ role: "user", content: "I need a job" }]);
    expect(spy.mock.calls[0][1]).toBe("en");
    expect(result.current.items.map((i) => [i.role, i.content])).toEqual([
      ["user", "I need a job"],
      ["assistant", "Which role?"],
    ]);
    expect(result.current.items[1].suggestions).toEqual(["Backend"]);
  });

  it("keeps only the card fields of the offers", async () => {
    events(reply("Here", { offers: [makeJob({ external_id: "1", title: "Dev", description: "long text" })] }));
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("jobs"));
    await waitFor(() => expect(result.current.status).toBe("idle"));

    const offer = result.current.items[1].offers?.[0];
    expect(offer).toMatchObject({ external_id: "1", title: "Dev" });
    expect(offer).not.toHaveProperty("description");
  });

  it("keeps the buttons that open pages of the site", async () => {
    events(reply("Open it here.", { links: [{ path: "/jobs?region=jerusalem", label: "Jerusalem offers" }] }));
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("jobs in jerusalem"));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.items[1].links).toEqual([{ path: "/jobs?region=jerusalem", label: "Jerusalem offers" }]);
  });

  it("sends the earlier messages with the next question", async () => {
    const spy = events(reply("Which role?"));
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("hi"));
    await waitFor(() => expect(result.current.status).toBe("idle"));

    spy.mockImplementation(async function* () {
      yield reply("ok");
    });
    act(() => result.current.send("backend"));
    await waitFor(() => expect(result.current.items).toHaveLength(4));

    expect(spy.mock.calls[1][0]).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "Which role?" },
      { role: "user", content: "backend" },
    ]);
  });

  it("shows the tool being run while thinking", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
      yield { type: "tool_call", callId: "a", name: "search_offers" };
      await gate;
      yield reply("done");
    });
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("jobs"));

    await waitFor(() => expect(result.current.step).toBe("search_offers"));
    release();
    await waitFor(() => expect(result.current.step).toBeNull());
  });

  it("ignores an empty message and a message sent while thinking", async () => {
    const spy = events(reply("ok"));
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("   "));
    expect(spy).not.toHaveBeenCalled();

    act(() => result.current.send("one"));
    act(() => result.current.send("two"));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it("fails on a network error, then retry asks again without repeating the question", async () => {
    const spy = vi.spyOn(chatApi, "streamChat").mockImplementation(() => {
      throw new Error("offline");
    });
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("jobs"));
    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.items).toHaveLength(1);

    spy.mockImplementation(async function* () {
      yield reply("back");
    });
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.items.map((i) => i.content)).toEqual(["jobs", "back"]);
    expect(spy.mock.calls[1][0]).toEqual([{ role: "user", content: "jobs" }]);
  });

  it("fails on an error event and on a stream that ends with no answer", async () => {
    events({ type: "error", message: "boom" });
    const first = renderHook(() => useChat());
    act(() => first.result.current.send("a"));
    await waitFor(() => expect(first.result.current.status).toBe("error"));

    sessionStorage.clear();
    events();
    const second = renderHook(() => useChat());
    act(() => second.result.current.send("b"));
    await waitFor(() => expect(second.result.current.status).toBe("error"));
  });

  it("restores the conversation after a reload and forgets it on reset", async () => {
    events(reply("hello"));
    const first = renderHook(() => useChat());
    act(() => first.result.current.send("hi"));
    await waitFor(() => expect(first.result.current.items).toHaveLength(2));
    first.unmount();

    const again = renderHook(() => useChat());
    expect(again.result.current.items.map((i) => i.content)).toEqual(["hi", "hello"]);

    act(() => again.result.current.reset());
    expect(again.result.current.items).toEqual([]);
    expect(sessionStorage.getItem("jobs-monitor.chat")).toBeNull();
  });

  it("does not answer after a reset", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* (_m, _l, signal) {
      await gate;
      if (signal?.aborted) throw new DOMException("aborted", "AbortError");
      yield reply("late");
    });
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("hi"));
    act(() => result.current.reset());
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(result.current).toMatchObject({ items: [], status: "idle" });
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../api/chat";
import type { ChatEvent } from "../api/chat";
import "../i18n";
import { quickReplies, reply, requestOf } from "../../tests/support/mocks/chatReplies";
import { useChat } from "./useChat";

function events(...list: ChatEvent[]) {
  return vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
    for (const e of list) yield e;
  });
}

beforeEach(() => sessionStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("useChat", () => {
  it("starts empty and idle", () => {
    const { result } = renderHook(() => useChat());
    expect(result.current).toMatchObject({ items: [], status: "idle", step: null });
  });

  it("sends the question with the language and shows the reply", async () => {
    const spy = events(reply("Which role?", quickReplies("Backend")));
    const { result } = renderHook(() => useChat());

    act(() => result.current.send("  I need a job  "));
    expect(result.current.status).toBe("thinking");

    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(requestOf(spy).messages).toEqual([{ role: "user", content: "I need a job" }]);
    expect(requestOf(spy).locale).toBe("en");
    expect(result.current.items.map((i) => [i.role, i.content])).toEqual([
      ["user", "I need a job"],
      ["assistant", "Which role?"],
    ]);
    expect(result.current.items[1].blocks).toEqual([quickReplies("Backend")]);
  });

  it("a user message has no blocks, an answer keeps the blocks it came with", async () => {
    events(reply("Here", quickReplies("More")));
    const { result } = renderHook(() => useChat());
    act(() => result.current.send("jobs"));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(result.current.items.map((i) => i.blocks.length)).toEqual([0, 1]);
  });

  it("sends what the user shares with each question, and what they share now (not at the first render)", async () => {
    const spy = events(reply("ok"));
    const profile = { skills: ["Node.js"], roles: ["backend"], languages: [], locations: [], titles: [], seniority: null, years: null };
    const { result, rerender } = renderHook(({ shared }) => useChat(shared), { initialProps: { shared: null as chatApi.ChatShared | null } });

    act(() => result.current.send("one"));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(requestOf(spy).shared).toBeNull();

    rerender({ shared: { profile } });
    act(() => result.current.send("two"));
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(requestOf(spy, 1).shared).toEqual({ profile });
  });

  it("tells the API which page the user is on, the page of the moment and not the one at the first render", async () => {
    const spy = events(reply("ok"));
    const { result, rerender } = renderHook(({ page }) => useChat(null, page), {
      initialProps: { page: { kind: "home" } as import("../utils/chatPage").ChatPage },
    });

    act(() => result.current.send("one"));
    await waitFor(() => expect(result.current.status).toBe("idle"));
    expect(requestOf(spy).page).toEqual({ kind: "home" });

    rerender({ page: { kind: "offer", source: "melio", externalId: "42" } });
    act(() => result.current.send("two"));
    await waitFor(() => expect(result.current.items).toHaveLength(4));
    expect(requestOf(spy, 1).page).toEqual({ kind: "offer", source: "melio", externalId: "42" });
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

    expect(requestOf(spy, 1).messages).toEqual([
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
    expect(requestOf(spy, 1).messages).toEqual([{ role: "user", content: "jobs" }]);
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
    expect(sessionStorage.getItem("jobs-monitor.chat.v2")).toBeNull();
  });

  it("does not answer after a reset", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* ({ signal }) {
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

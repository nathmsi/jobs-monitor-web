import { describe, expect, it } from "vitest";

import type { ChatItem } from "./chatMessages";
import { chatReducer, initialChatState } from "./chatReducer";

const user: ChatItem = { id: "u1", role: "user", content: "hi", blocks: [] };
const bot: ChatItem = { id: "a1", role: "assistant", content: "hello", blocks: [] };

describe("chatReducer", () => {
  it("starts idle and empty, or with the restored conversation", () => {
    expect(initialChatState()).toEqual({ items: [], status: "idle", step: null });
    expect(initialChatState([user]).items).toEqual([user]);
  });

  it("a sent message is added and the assistant starts thinking", () => {
    expect(chatReducer(initialChatState(), { type: "sent", item: user })).toEqual({ items: [user], status: "thinking", step: null });
  });

  it("remembers the current step only while thinking", () => {
    const thinking = chatReducer(initialChatState(), { type: "sent", item: user });
    expect(chatReducer(thinking, { type: "step", name: "search_offers" }).step).toBe("search_offers");
    expect(chatReducer(initialChatState(), { type: "step", name: "search_offers" }).step).toBeNull();
  });

  it("a reply is added and clears the step", () => {
    let s = chatReducer(initialChatState(), { type: "sent", item: user });
    s = chatReducer(s, { type: "step", name: "search_offers" });
    expect(chatReducer(s, { type: "replied", item: bot })).toEqual({ items: [user, bot], status: "idle", step: null });
  });

  it("a failure keeps the conversation, and retry makes the assistant think again", () => {
    let s = chatReducer(initialChatState(), { type: "sent", item: user });
    s = chatReducer(s, { type: "failed" });
    expect(s).toEqual({ items: [user], status: "error", step: null });
    expect(chatReducer(s, { type: "retry" })).toEqual({ items: [user], status: "thinking", step: null });
  });

  it("retry does nothing when there was no failure", () => {
    const s = initialChatState([user]);
    expect(chatReducer(s, { type: "retry" })).toBe(s);
  });

  it("reset empties the conversation", () => {
    expect(chatReducer(initialChatState([user, bot]), { type: "reset" })).toEqual(initialChatState());
  });
});

import { describe, expect, it } from "vitest";

import { MAX_API_MESSAGES, MAX_MESSAGE_CHARS, toApiMessages, type ChatItem } from "./chatMessages";

const user = (content: string, id = content): ChatItem => ({ id, role: "user", content });
const bot = (content: string, extra: Partial<ChatItem> = {}): ChatItem => ({ id: content || "b", role: "assistant", content, ...extra });
const offer = { source: "a", external_id: "1", title: "T", location: "", excerpt: "", is_hot: false, is_expired: false, added_at: null };

describe("toApiMessages", () => {
  it("keeps role and text, in order", () => {
    expect(toApiMessages([user("hi"), bot("Which role?"), user("backend")])).toEqual([
      { role: "user", content: "hi" },
      { role: "assistant", content: "Which role?" },
      { role: "user", content: "backend" },
    ]);
  });

  it("sends a reply made only of cards as a short note, not as offer data", () => {
    const out = toApiMessages([user("jobs"), bot("", { offers: [offer, offer] })]);
    expect(out[1]).toEqual({ role: "assistant", content: "[Showed 2 offers]" });
  });

  it("drops empty messages", () => {
    expect(toApiMessages([user("hi"), bot("  "), user("again")]).map((m) => m.content)).toEqual(["hi", "again"]);
  });

  it("keeps the most recent messages and starts with a user message", () => {
    const items: ChatItem[] = [];
    for (let i = 0; i < 15; i++) items.push(user(`q${i}`), bot(`a${i}`));
    const out = toApiMessages(items);
    expect(out.length).toBeLessThanOrEqual(MAX_API_MESSAGES);
    expect(out[0].role).toBe("user");
    expect(out.at(-1)?.content).toBe("a14");
  });

  it("cuts a message that is too long", () => {
    expect(toApiMessages([user("x".repeat(MAX_MESSAGE_CHARS + 50))])[0].content).toHaveLength(MAX_MESSAGE_CHARS);
  });

  it("is empty when there is no user message", () => {
    expect(toApiMessages([bot("hello")])).toEqual([]);
  });
});

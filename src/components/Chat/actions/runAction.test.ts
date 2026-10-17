import { describe, expect, it, vi } from "vitest";

import { hrefOf } from "./hrefOf";
import { runChatAction, type ActionDeps } from "./runAction";
import type { ChatAction } from "./types";

function deps(): ActionDeps {
  return { navigate: vi.fn(), send: vi.fn(), markOpened: vi.fn(), afterNavigate: vi.fn() };
}

describe("runChatAction", () => {
  it("navigate goes to the page, then lets the chat step aside", () => {
    const d = deps();
    runChatAction({ type: "navigate", path: "/jobs?region=jerusalem" }, d);
    expect(d.navigate).toHaveBeenCalledWith("/jobs?region=jerusalem");
    expect(d.afterNavigate).toHaveBeenCalledTimes(1);
    expect(d.send).not.toHaveBeenCalled();
  });

  it("send hands the text to the assistant, and goes nowhere", () => {
    const d = deps();
    runChatAction({ type: "send", text: "Jobs in Jerusalem" }, d);
    expect(d.send).toHaveBeenCalledWith("Jobs in Jerusalem");
    expect(d.navigate).not.toHaveBeenCalled();
    expect(d.afterNavigate).not.toHaveBeenCalled();
  });

  it("open-offer marks the offer as seen and opens its own page", () => {
    const d = deps();
    runChatAction({ type: "open-offer", source: "melio", externalId: "42", title: "Senior Backend Engineer" }, d);
    expect(d.markOpened).toHaveBeenCalledWith("melio-42");
    expect(d.navigate).toHaveBeenCalledWith("/jobs/melio/42/senior-backend-engineer");
    expect(d.afterNavigate).toHaveBeenCalledTimes(1);
  });
});

describe("hrefOf", () => {
  it("gives the address of the actions that open a page, none for the others", () => {
    const actions: [ChatAction, string | null][] = [
      [{ type: "navigate", path: "/coach" }, "/coach"],
      [{ type: "open-offer", source: "a b", externalId: "1/2", title: "Dev" }, "/jobs/a%20b/1%2F2/dev"],
      [{ type: "send", text: "hi" }, null],
    ];
    for (const [action, href] of actions) expect(hrefOf(action)).toBe(href);
  });
});

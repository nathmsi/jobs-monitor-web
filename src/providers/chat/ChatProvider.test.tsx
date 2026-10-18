import { screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { ChatAction } from "../../components/Chat/actions/types";
import i18n from "../../i18n";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ChatProvider } from "./ChatProvider";
import { useChatContext } from "./useChatContext";

/** A probe that shows what the context holds and has a button for each action. */
function Probe({ actions }: { actions: ChatAction[] }) {
  const { page, config, act } = useChatContext();
  return (
    <div>
      <output data-testid="page">{JSON.stringify(page)}</output>
      <output data-testid="config">{JSON.stringify(config)}</output>
      {actions.map((action) => (
        <button key={action.type} type="button" onClick={() => act(action)}>
          {action.type}
        </button>
      ))}
    </div>
  );
}

const ACTIONS: ChatAction[] = [
  { type: "navigate", path: "/coach" },
  { type: "send", text: "hello" },
  { type: "open-offer", source: "melio", externalId: "42", title: "Senior Backend Engineer" },
];

function setup(props: Partial<{ page: import("../../utils/chatPage").ChatPage; sharing: boolean }> = {}) {
  const send = vi.fn();
  const onNavigated = vi.fn();
  const ui = renderWithProviders(
    <ChatProvider page={props.page ?? { kind: "home" }} sharing={props.sharing ?? false} send={send} onNavigated={onNavigated}>
      <Probe actions={ACTIONS} />
    </ChatProvider>,
  );
  return { ...ui, send, onNavigated };
}

describe("ChatProvider", () => {
  beforeEach(async () => {
    localStorage.clear();
    await i18n.changeLanguage("en");
  });

  it("tells the blocks where the user is and how the chat is set up", () => {
    setup({ page: { kind: "offer", source: "melio", externalId: "42" }, sharing: true });
    expect(JSON.parse(screen.getByTestId("page").textContent ?? "")).toEqual({ kind: "offer", source: "melio", externalId: "42" });
    expect(JSON.parse(screen.getByTestId("config").textContent ?? "")).toEqual({ sharing: true, locale: "en" });
  });

  it("follows the language of the interface", async () => {
    setup();
    await i18n.changeLanguage("fr");
    expect(JSON.parse(await screen.findByTestId("config").then((el) => el.textContent ?? ""))).toMatchObject({ locale: "fr" });
  });

  it("navigate goes to the page with the router, then the chat steps aside", async () => {
    const { user, onNavigated, send } = setup();
    await user.click(screen.getByRole("button", { name: "navigate" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/coach");
    expect(onNavigated).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it("send hands the text to the chat and does not move", async () => {
    const { user, send, onNavigated } = setup();
    await user.click(screen.getByRole("button", { name: "send" }));

    expect(send).toHaveBeenCalledWith("hello");
    expect(screen.getByTestId("location")).toHaveTextContent("/");
    expect(onNavigated).not.toHaveBeenCalled();
  });

  it("open-offer opens the offer's page, marks it as seen, and the chat steps aside", async () => {
    const { user, onNavigated } = setup();
    await user.click(screen.getByRole("button", { name: "open-offer" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/jobs/melio/42/senior-backend-engineer");
    expect(onNavigated).toHaveBeenCalledTimes(1);
    expect(JSON.parse(localStorage.getItem("jobFlags.opened.v1") ?? "[]")).toContain("melio-42");
  });

  it("is required: a block outside the provider is a bug, and says so", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    expect(() => renderWithProviders(<Probe actions={[]} />)).toThrow("useChatContext must be used within ChatProvider");
    spy.mockRestore();
  });
});

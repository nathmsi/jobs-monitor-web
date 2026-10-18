import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../../../src/api/chat";
import { ChatWidget } from "../../../src/components/Chat/ChatWidget";
import i18n from "../../../src/i18n";
import { mockBackend } from "../../support/mocks/apiMock";
import { reply } from "../../support/mocks/chatReplies";
import { openChat } from "../../support/render/openChat";
import { renderWithProviders } from "../../support/render/renderWithProviders";

describe("Chat · the window (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    mockBackend({ jobs: [] });
    await i18n.changeLanguage("en");
  });

  it("enlarges the window on a desktop, and remembers it", async () => {
    const first = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(first);

    const enlarge = within(dialog).getByRole("button", { name: "Enlarge the chat" });
    expect(enlarge).toHaveAttribute("aria-pressed", "false");
    await first.user.click(enlarge);
    expect(within(dialog).getByRole("button", { name: "Reduce the chat" })).toHaveAttribute("aria-pressed", "true");
    first.unmount();

    const second = renderWithProviders(<ChatWidget />);
    const again = await openChat(second);
    expect(within(again).getByRole("button", { name: "Reduce the chat" })).toBeInTheDocument();
    await second.user.click(within(again).getByRole("button", { name: "Reduce the chat" }));
    expect(within(again).getByRole("button", { name: "Enlarge the chat" })).toHaveAttribute("aria-pressed", "false");
  });

  it("double-clicking the header puts the window back where it opens", async () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ frame: { left: 200, top: 150, width: 700, height: 600 }, share: false }));
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    expect(within(dialog).getByRole("button", { name: "Reduce the chat" })).toBeInTheDocument();

    await ui.user.dblClick(within(dialog).getByRole("heading", { name: "Job assistant" }));

    expect(within(dialog).getByRole("button", { name: "Enlarge the chat" })).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("jobs-monitor.chat.prefs") ?? "{}").frame).toBeNull();
  });

  it("a double-click on a header button is not a reset", async () => {
    localStorage.setItem("jobs-monitor.chat.prefs", JSON.stringify({ frame: { left: 200, top: 150, width: 700, height: 600 }, share: false }));
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.dblClick(within(dialog).getByRole("button", { name: "New chat" }));

    expect(JSON.parse(localStorage.getItem("jobs-monitor.chat.prefs") ?? "{}").frame).not.toBeNull();
  });
});

describe("Chat · closing by clicking outside", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    mockBackend({ jobs: [] });
    await i18n.changeLanguage("en");
  });

  it("a click on the page closes the window, without moving the focus", async () => {
    const ui = renderWithProviders(
      <>
        <ChatWidget />
        <button type="button">The page</button>
      </>,
    );
    await openChat(ui);

    await ui.user.click(screen.getByRole("button", { name: "The page" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "The page" })).toHaveFocus();
  });

  it("a click inside the window, or on the launcher, is not 'outside'", async () => {
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.click(within(dialog).getByRole("heading", { name: "Job assistant" }));
    await ui.user.click(within(dialog).getByRole("textbox", { name: "Your message" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    // The launcher toggles once: it does not close on the outside-click and open again on its own click.
    await ui.user.click(screen.getByRole("button", { name: "Close the chat", expanded: true }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("keeps the conversation and the unsent text when it closes that way", async () => {
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
      yield reply("An answer.");
    });
    const ui = renderWithProviders(
      <>
        <ChatWidget />
        <button type="button">The page</button>
      </>,
    );
    const dialog = await openChat(ui);
    const box = within(dialog).getByRole("textbox", { name: "Your message" });
    await ui.user.type(box, "first{Enter}");
    await within(dialog).findByText("An answer.");
    await ui.user.type(box, "half a sentence");

    await ui.user.click(screen.getByRole("button", { name: "The page" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const again = await openChat(ui);
    expect(within(again).getByText("An answer.")).toBeInTheDocument();
    expect(within(again).getByRole("textbox", { name: "Your message" })).toHaveValue("half a sentence");
  });

  it("does not listen when it is closed", async () => {
    const ui = renderWithProviders(
      <>
        <ChatWidget />
        <button type="button">The page</button>
      </>,
    );
    await ui.user.click(screen.getByRole("button", { name: "The page" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask AI", expanded: false })).toBeInTheDocument();
  });
});

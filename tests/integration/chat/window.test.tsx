import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

/** A desktop wide enough to dock the chat (the setup's matchMedia says "no" to everything). */
function wideScreen(wide = true) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: wide && query.includes("min-width: 900px"),
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
}

describe("Chat · docked to the side (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    mockBackend({ jobs: [] });
    await i18n.changeLanguage("en");
  });

  afterEach(() => vi.unstubAllGlobals());

  const storedPrefs = () => JSON.parse(localStorage.getItem("jobs-monitor.chat.prefs") ?? "{}");

  it("opens docked to the side by default, where there is room, and the page makes room for it", async () => {
    wideScreen();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    expect(dialog).toHaveAttribute("data-docked");
    expect(document.documentElement).toHaveAttribute("data-chat-dock");
    expect(document.documentElement.style.getPropertyValue("--chat-dock-width")).toBe("420px");
    expect(within(dialog).getByRole("button", { name: "Float the chat", pressed: true })).toBeInTheDocument();
    expect(within(dialog).queryByRole("button", { name: "Enlarge the chat" })).not.toBeInTheDocument();
    expect(screen.getByTestId("chat-dock-resize")).toBeInTheDocument();
    expect(screen.queryByTestId("chat-resize-w")).not.toBeInTheDocument(); // the 8 handles of the floating window are gone
  });

  it("on a screen too narrow for it, it floats, with no dock button", async () => {
    wideScreen(false);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    expect(dialog).not.toHaveAttribute("data-docked");
    expect(within(dialog).queryByRole("button", { name: /Dock to the side|Float the chat/ })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Enlarge the chat" })).toBeInTheDocument();
  });

  it("the user can float it with the button, and dock it again", async () => {
    wideScreen();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.click(within(dialog).getByRole("button", { name: "Float the chat" }));
    expect(dialog).not.toHaveAttribute("data-docked");
    expect(document.documentElement).not.toHaveAttribute("data-chat-dock"); // the page has its room back
    expect(within(dialog).getByRole("button", { name: "Enlarge the chat" })).toBeInTheDocument();
    expect(storedPrefs().dock).toBe(false);

    await ui.user.click(within(dialog).getByRole("button", { name: "Dock to the side" }));
    expect(dialog).toHaveAttribute("data-docked");
    expect(storedPrefs().dock).toBe(true);
  });

  it("pulling the header off the side detaches it and keeps it in the user's hand", async () => {
    wideScreen();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    const header = within(dialog).getByRole("heading", { name: "Job assistant" });

    fireEvent(header, new MouseEvent("pointerdown", { bubbles: true, clientX: 1100, clientY: 40, button: 0 }));
    fireEvent(window, new MouseEvent("pointermove", { bubbles: true, clientX: 1000, clientY: 90 }));

    await waitFor(() => expect(dialog).not.toHaveAttribute("data-docked"));
    expect(document.documentElement).not.toHaveAttribute("data-chat-dock");
    fireEvent(window, new MouseEvent("pointerup", { bubbles: true, clientX: 1000, clientY: 90 }));
    expect(storedPrefs().dock).toBe(false);
  });

  it("a click on the header that does not move keeps it docked", async () => {
    wideScreen();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.click(within(dialog).getByRole("heading", { name: "Job assistant" }));
    expect(dialog).toHaveAttribute("data-docked");
  });

  it("closing the chat gives the page its room back", async () => {
    wideScreen();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.click(within(dialog).getByRole("button", { name: "Close the chat" }));
    expect(document.documentElement).not.toHaveAttribute("data-chat-dock");
  });

  it("docked, a click on the page does not close it; floating, it does", async () => {
    wideScreen();
    const ui = renderWithProviders(
      <>
        <ChatWidget />
        <button type="button">The page</button>
      </>,
    );
    const dialog = await openChat(ui);

    await ui.user.click(screen.getByRole("button", { name: "The page" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await ui.user.click(within(dialog).getByRole("button", { name: "Float the chat" }));
    await ui.user.click(screen.getByRole("button", { name: "The page" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("a user who floated it finds it floating next time", async () => {
    wideScreen();
    const first = renderWithProviders(<ChatWidget />);
    await first.user.click(within(await openChat(first)).getByRole("button", { name: "Float the chat" }));
    first.unmount();

    const second = renderWithProviders(<ChatWidget />);
    expect(await openChat(second)).not.toHaveAttribute("data-docked");
  });

  it("the dock chosen on a wide screen floats on a narrow one, and comes back when it is wide again", async () => {
    wideScreen();
    const wide = renderWithProviders(<ChatWidget />);
    expect(await openChat(wide)).toHaveAttribute("data-docked");
    wide.unmount();

    wideScreen(false);
    const narrow = renderWithProviders(<ChatWidget />);
    expect(await openChat(narrow)).not.toHaveAttribute("data-docked");
    narrow.unmount();

    wideScreen(true);
    const wideAgain = renderWithProviders(<ChatWidget />);
    expect(await openChat(wideAgain)).toHaveAttribute("data-docked");
  });
});

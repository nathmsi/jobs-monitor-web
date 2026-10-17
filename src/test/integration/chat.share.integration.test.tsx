import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../../api/chat";
import { ChatWidget } from "../../components/Chat/ChatWidget";
import i18n from "../../i18n";
import { PROFILE_LOCAL_KEY } from "../../providers/profile/profileStorage";
import { mockBackend } from "../../../tests/support/mocks/apiMock";
import { CV_PROFILE } from "../../../tests/support/factories";
import { reply, requestOf } from "../../../tests/support/mocks/chatReplies";
import { renderWithProviders } from "../../../tests/support/render/renderWithProviders";

const pdf = vi.hoisted(() => ({ extractPdfText: vi.fn() }));
vi.mock("../../utils/pdf", () => pdf);

const CV_TEXT = "Jane Doe, Senior Backend Developer. Six years of Node.js, TypeScript and PostgreSQL. Docker and AWS.";

const asks = () => vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
  yield reply("ok");
});

async function openChat(ui: ReturnType<typeof renderWithProviders>) {
  await ui.user.click(screen.getByRole("button", { name: "Ask AI" }));
  return screen.findByRole("dialog", { name: "Job assistant" });
}

const pdfFile = (name = "cv.pdf", size = 1000) => {
  const file = new File(["x".repeat(size)], name, { type: "application/pdf" });
  return file;
};

describe("Chat · sharing the CV and profile (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    pdf.extractPdfText.mockReset();
    sessionStorage.clear();
    mockBackend({ jobs: [] });
    await i18n.changeLanguage("en");
  });

  it("offers nothing to share until the user has a CV profile, but always the paperclip", async () => {
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    expect(within(dialog).queryByRole("switch")).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Add my CV (PDF)" })).toBeInTheDocument();
  });

  it("with a profile, a switch that is off by default: the assistant does not see the CV", async () => {
    localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(CV_PROFILE));
    const spy = asks();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    const toggle = within(dialog).getByRole("switch", { name: /Use my CV/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    expect(within(dialog).getByText(/does not see your CV/)).toBeInTheDocument();

    await ui.user.type(within(dialog).getByRole("textbox", { name: "Your message" }), "hello{Enter}");
    await within(dialog).findByText("ok");
    expect(requestOf(spy).shared).toBeNull();
  });

  it("switching on sends the profile with the next question, and the first starter becomes 'for my CV'", async () => {
    localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(CV_PROFILE));
    const spy = asks();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.click(within(dialog).getByRole("switch", { name: /Use my CV/ }));
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(within(dialog).getByText(/never stored/)).toBeInTheDocument();

    await ui.user.click(within(dialog).getByRole("button", { name: "Find offers that fit my CV" }));
    await within(dialog).findByText("ok");

    const shared = requestOf(spy).shared;
    expect(shared?.profile?.skills).toEqual(CV_PROFILE.skills);
    expect(shared?.profile).not.toHaveProperty("education");
  });

  it("the choice is remembered for the next visit", async () => {
    localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(CV_PROFILE));
    const first = renderWithProviders(<ChatWidget />);
    await ui(first).click(within(await openChat(first)).getByRole("switch"));
    first.unmount();

    const second = renderWithProviders(<ChatWidget />);
    expect(within(await openChat(second)).getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("a CV added with the paperclip is read on the device, shared, and readable by the assistant", async () => {
    pdf.extractPdfText.mockResolvedValue(CV_TEXT);
    const spy = asks();
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.upload(within(dialog).getByTestId("chat-cv-input"), pdfFile("Jane_CV.pdf"));

    expect(await within(dialog).findByText(/CV added: Jane_CV.pdf/)).toBeInTheDocument();
    expect(within(dialog).getByRole("switch")).toHaveAttribute("aria-checked", "true");
    // The profile is saved on this device (like on the Profile page), the PDF itself is not kept.
    expect(JSON.parse(localStorage.getItem(PROFILE_LOCAL_KEY) ?? "{}").skills).toEqual(expect.arrayContaining(["TypeScript"]));
    expect(localStorage.getItem(PROFILE_LOCAL_KEY)).not.toContain("Jane Doe");

    await ui.user.type(within(dialog).getByRole("textbox", { name: "Your message" }), "review my CV{Enter}");
    await within(dialog).findByText("ok");
    const shared = requestOf(spy).shared;
    expect(shared?.cvs).toEqual([{ id: "attached", name: "Jane_CV.pdf", text: CV_TEXT }]);
    expect(shared?.profile?.skills).toEqual(expect.arrayContaining(["TypeScript"]));
  });

  it.each([
    ["a file that is not a PDF", new File(["hello"], "notes.txt", { type: "text/plain" }), /choose a PDF/],
    ["a file that is too big", pdfFile("huge.pdf", 9 * 1024 * 1024), /too big/],
  ])("refuses %s, and shares nothing", async (_name, file, message) => {
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    // The input filters on .pdf, but a file can still be dropped or forced in: the app checks it too.
    fireEvent.change(within(dialog).getByTestId("chat-cv-input"), { target: { files: [file] } });

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(message);
    expect(pdf.extractPdfText).not.toHaveBeenCalled();
    expect(within(dialog).queryByRole("switch")).not.toBeInTheDocument();
  });

  it("says so when the PDF cannot be read, or holds no skill", async () => {
    pdf.extractPdfText.mockRejectedValueOnce(new Error("bad pdf"));
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.upload(within(dialog).getByTestId("chat-cv-input"), pdfFile());
    expect(await within(dialog).findByRole("alert")).toHaveTextContent(/Could not read this PDF/);

    pdf.extractPdfText.mockResolvedValueOnce("Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor.");
    await ui.user.upload(within(dialog).getByTestId("chat-cv-input"), pdfFile());
    await waitFor(() => expect(within(dialog).getByRole("alert")).toHaveTextContent(/could not find any technical skill/));
    expect(within(dialog).queryByRole("switch")).not.toBeInTheDocument();
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

describe("Chat · closing by clicking outside (integration)", () => {
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

/** The user-event instance of a render (the helper returns it next to the queries). */
function ui(r: ReturnType<typeof renderWithProviders>) {
  return r.user;
}

import { fireEvent, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../../../src/api/chat";
import { ChatWidget } from "../../../src/components/Chat/ChatWidget";
import i18n from "../../../src/i18n";
import { PROFILE_LOCAL_KEY } from "../../../src/providers/profile/profileStorage";
import { mockBackend } from "../../support/mocks/apiMock";
import { CV_PROFILE } from "../../support/factories";
import { reply, requestOf } from "../../support/mocks/chatReplies";
import { openChat } from "../../support/render/openChat";
import { renderWithProviders } from "../../support/render/renderWithProviders";

const pdf = vi.hoisted(() => ({ extractPdfText: vi.fn() }));
vi.mock("../../../src/utils/pdf", () => pdf);

const CV_TEXT = "Jane Doe, Senior Backend Developer. Six years of Node.js, TypeScript and PostgreSQL. Docker and AWS.";

const asks = () => vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
  yield reply("ok");
});

const pdfFile = (name = "cv.pdf", size = 1000) => {
  const file = new File(["x".repeat(size)], name, { type: "application/pdf" });
  return file;
};

describe("Chat · sharing the CV and profile", () => {
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
    await first.user.click(within(await openChat(first)).getByRole("switch"));
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
});

import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as chatApi from "../../api/chat";
import type { ChatEvent } from "../../api/chat";
import { ChatWidget } from "../../components/Chat/ChatWidget";
import i18n from "../../i18n";
import { mockBackend } from "../apiMock";
import { makeJob } from "../factories";
import { apiReply, offersBlock, quickReplies, reply, requestOf } from "../chatReplies";
import { renderWithProviders } from "../renderWithProviders";

const OFFER = makeJob({
  source: "melio",
  external_id: "42",
  title: "Senior Backend Engineer",
  location: "Tel Aviv, Israel",
  excerpt: "Build payment services with Node.js",
});

/** The assistant answers with the given events, one script per question. */
function assistant(...scripts: ChatEvent[][]) {
  const queue = [...scripts];
  return vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
    for (const e of queue.shift() ?? []) yield e;
  });
}

async function openChat(ui: ReturnType<typeof renderWithProviders>) {
  await ui.user.click(screen.getByRole("button", { name: "Ask AI" }));
  return screen.findByRole("dialog", { name: "Job assistant" });
}

describe("Chat assistant (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    sessionStorage.clear();
    mockBackend({ jobs: [OFFER] });
    await i18n.changeLanguage("en");
  });

  it("is a launcher until opened, then a dialog with an intro and starter questions", async () => {
    const ui = renderWithProviders(<ChatWidget />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    const dialog = await openChat(ui);
    expect(within(dialog).getByText(/Ask me anything/)).toBeInTheDocument();
    expect(within(dialog).getByText(/Ask me anything/)).toBeInTheDocument();
    expect(within(dialog).getAllByRole("button", { name: /Backend jobs in Tel Aviv|Jobs in Jerusalem|How do I use this site|prepare for a tech interview/ })).toHaveLength(4);
    expect(screen.getByRole("button", { name: "Close the chat", expanded: true })).toBeInTheDocument();
  });

  it("answers a question with text and clickable offers", async () => {
    const spy = assistant([
      { type: "tool_call", callId: "a", name: "search_offers" },
      reply("Here is a good match.", offersBlock(OFFER)),
    ]);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.type(within(dialog).getByRole("textbox", { name: "Your message" }), "node jobs in tel aviv{Enter}");

    expect(await within(dialog).findByText(/Here is a good match/)).toBeInTheDocument();
    expect(requestOf(spy).messages).toEqual([{ role: "user", content: "node jobs in tel aviv" }]);

    const offers = within(dialog).getByRole("list", { name: "Matching offers" });
    const link = within(offers).getByRole("link", { name: "Senior Backend Engineer" });
    expect(link).toHaveAttribute("href", "/jobs/melio/42/senior-backend-engineer");
    expect(within(offers).getByText("Melio")).toBeInTheDocument();
    expect(within(offers).getByText("Tel Aviv")).toBeInTheDocument();
  });

  it("opening an offer goes to the normal offer page", async () => {
    assistant([reply("Try this one.", offersBlock(OFFER))]);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.click(within(dialog).getByRole("button", { name: "Jobs in Jerusalem" }));

    await ui.user.click(await within(dialog).findByRole("link", { name: "Senior Backend Engineer" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs/melio/42/senior-backend-engineer");
  });

  it("shows buttons that open pages of the site, and following one opens that page", async () => {
    assistant([
      apiReply("Here are the steps.", {
        type: "links",
        links: [
          { path: "/jobs?region=jerusalem", label: "Jerusalem offers" },
          { path: "https://evil.example", label: "Win a prize" },
        ],
      }),
    ]);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.click(within(dialog).getByRole("button", { name: "How do I use this site?" }));

    const links = await within(dialog).findByRole("list", { name: "Open in the site" });
    // A link that leaves the site is never shown.
    expect(within(links).getAllByRole("link")).toHaveLength(1);
    expect(within(links).queryByText("Win a prize")).not.toBeInTheDocument();

    await ui.user.click(within(links).getByRole("link", { name: "Jerusalem offers" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?region=jerusalem");
  });

  it("a starter question is sent as the user's message", async () => {
    const spy = assistant([reply("ok")]);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);

    await ui.user.click(within(dialog).getByRole("button", { name: "Backend jobs in Tel Aviv" }));
    await within(dialog).findByText("ok");
    expect(requestOf(spy).messages).toEqual([{ role: "user", content: "Backend jobs in Tel Aviv" }]);
  });

  it("asks a question with quick replies, and a tap sends the answer with the history", async () => {
    const spy = assistant(
      [reply("Which role?", quickReplies("Backend", "Frontend"))],
      [reply("Searching backend.")],
    );
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.type(within(dialog).getByRole("textbox"), "I need a job{Enter}");

    await ui.user.click(await within(dialog).findByRole("button", { name: "Backend" }));

    await within(dialog).findByText("Searching backend.");
    expect(requestOf(spy, 1).messages).toEqual([
      { role: "user", content: "I need a job" },
      { role: "assistant", content: "Which role?" },
      { role: "user", content: "Backend" },
    ]);
    // Quick replies are for the latest message only.
    expect(within(dialog).queryByRole("button", { name: "Frontend" })).not.toBeInTheDocument();
  });

  it("tells the user what the assistant is doing while it works", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
      yield { type: "tool_call", callId: "a", name: "search_offers" };
      await gate;
      yield reply("done");
    });
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.type(within(dialog).getByRole("textbox"), "jobs{Enter}");

    expect(await within(dialog).findByRole("status")).toHaveTextContent("Searching offers…");
    expect(within(dialog).getByRole("button", { name: "Send" })).toBeDisabled();

    release();
    await within(dialog).findByText("done");
    expect(within(dialog).queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows an error and retries without asking the question twice", async () => {
    const spy = vi.spyOn(chatApi, "streamChat").mockImplementationOnce(() => {
      throw new Error("offline");
    });
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.type(within(dialog).getByRole("textbox"), "jobs{Enter}");

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Something went wrong");

    spy.mockImplementation(async function* () {
      yield reply("Back online.");
    });
    await ui.user.click(within(dialog).getByRole("button", { name: "Try again" }));

    await within(dialog).findByText("Back online.");
    expect(within(dialog).queryByRole("alert")).not.toBeInTheDocument();
    expect(within(dialog).getAllByText("jobs")).toHaveLength(1);
  });

  it("keeps the answer when the window is closed while the assistant works", async () => {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    vi.spyOn(chatApi, "streamChat").mockImplementation(async function* () {
      await gate;
      yield reply("Finished while closed.");
    });
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.type(within(dialog).getByRole("textbox"), "jobs{Enter}");

    await ui.user.click(within(dialog).getByRole("button", { name: "Close the chat" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    release();

    const reopened = await openChat(ui);
    expect(await within(reopened).findByText("Finished while closed.")).toBeInTheDocument();
  });

  it("Escape closes the window and gives the focus back to the launcher", async () => {
    const ui = renderWithProviders(<ChatWidget />);
    await openChat(ui);

    await ui.user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ask AI" })).toHaveFocus();
  });

  it("a new chat starts from the intro again", async () => {
    assistant([reply("first answer")]);
    const ui = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(ui);
    await ui.user.type(within(dialog).getByRole("textbox"), "hello{Enter}");
    await within(dialog).findByText("first answer");

    await ui.user.click(within(dialog).getByRole("button", { name: "New chat" }));

    expect(within(dialog).queryByText("first answer")).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Ask me anything/)).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "New chat" })).toBeDisabled();
  });

  it("restores the conversation after a reload", async () => {
    assistant([reply("remembered")]);
    const first = renderWithProviders(<ChatWidget />);
    const dialog = await openChat(first);
    await first.user.type(within(dialog).getByRole("textbox"), "hi{Enter}");
    await within(dialog).findByText("remembered");
    first.unmount();

    const second = renderWithProviders(<ChatWidget />);
    const again = await openChat(second);
    expect(within(again).getByText("remembered")).toBeInTheDocument();
  });

  it("speaks French and Hebrew, and tells the API which language to answer in", async () => {
    const spy = assistant([reply("Bonjour")]);
    await i18n.changeLanguage("fr");
    const ui = renderWithProviders(<ChatWidget />);
    await ui.user.click(screen.getByRole("button", { name: "Demander à l'IA" }));
    const dialog = await screen.findByRole("dialog", { name: "Assistant emploi" });
    await ui.user.type(within(dialog).getByRole("textbox", { name: "Votre message" }), "salut{Enter}");

    await waitFor(() => expect(spy).toHaveBeenCalled());
    expect(requestOf(spy).locale).toBe("fr");
    await i18n.changeLanguage("he");
    await waitFor(() => expect(screen.getByRole("dialog", { name: "עוזר משרות" })).toBeInTheDocument());
  });
});

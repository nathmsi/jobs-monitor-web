import { fireEvent, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../i18n";
import { mockBackend } from "../../../../tests/support/mocks/apiMock";
import { makeJob } from "../../../../tests/support/factories";
import { offersBlock, linksBlock, quickReplies } from "../../../../tests/support/mocks/chatReplies";
import { renderChatPart } from "../../../../tests/support/render/renderChatPart";
import { ChatBlocks } from "./ChatBlocks";
import type { ChatBlock } from "./types";

const JOB = makeJob({ external_id: "42", title: "Senior Backend Engineer", location: "Tel Aviv, Israel", excerpt: "Payments" });

function render(blocks: ChatBlock[], active = true) {
  return renderChatPart(<ChatBlocks blocks={blocks} active={active} />);
}

describe("ChatBlocks", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: [] });
    await i18n.changeLanguage("en");
  });

  it("draws each block with the view of its kind, in order", () => {
    render([offersBlock(JOB), linksBlock(["/coach", "Analyse my CV"]), quickReplies("More")]);

    expect(screen.getByRole("list", { name: "Matching offers" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Open in the site" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
  });

  it("shows quick replies only under the latest answer", () => {
    const { rerender } = render([quickReplies("More")], true);
    expect(screen.getByRole("button", { name: "More" })).toBeInTheDocument();
    rerender(<ChatBlocks blocks={[quickReplies("More")]} active={false} />);
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });

  it("keeps the other blocks of an old answer", () => {
    render([offersBlock(JOB), linksBlock(["/coach", "Analyse my CV"]), quickReplies("More")], false);
    expect(screen.getByRole("list", { name: "Matching offers" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Analyse my CV" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "More" })).not.toBeInTheDocument();
  });

  it("draws nothing for an empty list", () => {
    render([]);
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("the offers block", () => {
  beforeEach(() => mockBackend({ jobs: [] }));

  it("is a card per offer with the company, title and place; the title opens the offer", async () => {
    const { act, user } = render([offersBlock(JOB)]);
    const card = screen.getByRole("article");
    expect(within(card).getByText("Tel Aviv")).toBeInTheDocument();

    const link = within(card).getByRole("link", { name: "Senior Backend Engineer" });
    expect(link).toHaveAttribute("href", "/jobs/melio/42/senior-backend-engineer");
    await user.click(link);

    expect(act).toHaveBeenCalledWith({ type: "open-offer", source: "melio", externalId: "42", title: "Senior Backend Engineer" });
  });

  it("leaves a click with Ctrl or Cmd to the browser, so the offer opens in a new tab and the chat does not act", () => {
    const { act } = render([offersBlock(JOB)]);
    const link = screen.getByRole("link", { name: "Senior Backend Engineer" });

    fireEvent.click(link, { ctrlKey: true });
    fireEvent.click(link, { metaKey: true });
    fireEvent.click(link, { button: 1 });

    expect(act).not.toHaveBeenCalled();
  });
});

describe("the links block", () => {
  beforeEach(() => mockBackend({ jobs: [] }));

  it("is a real link to the page, and a click asks for the navigate action", async () => {
    const { act, user } = render([linksBlock(["/jobs?region=jerusalem", "Jerusalem offers"])]);
    const link = screen.getByRole("link", { name: "Jerusalem offers" });
    expect(link).toHaveAttribute("href", "/jobs?region=jerusalem");

    await user.click(link);
    expect(act).toHaveBeenCalledWith({ type: "navigate", path: "/jobs?region=jerusalem" });
  });
});

describe("the quick replies block", () => {
  beforeEach(() => mockBackend({ jobs: [] }));

  it("is a button per reply, and a click asks for the send action with that text", async () => {
    const { act, user } = render([quickReplies("Backend", "Frontend")]);

    await user.click(screen.getByRole("button", { name: "Frontend" }));

    expect(act).toHaveBeenCalledTimes(1);
    expect(act).toHaveBeenCalledWith({ type: "send", text: "Frontend" });
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });
});

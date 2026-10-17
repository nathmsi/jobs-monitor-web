import { normalizeReply, type ChatEvent, type ChatReply } from "../../../src/api/chat";
import type { ChatBlock, ChatOffer } from "../../../src/components/Chat/blocks/types";
import { toChatOffer } from "../../../src/components/Chat/blocks/offers/offers.model";
import type { Job } from "../../../src/types";

/** A `final` event: the assistant's text, then blocks. Build the blocks with the helpers below. */
export const reply = (text: string, ...blocks: ChatBlock[]): ChatEvent => ({ type: "final", reply: { text, blocks } satisfies ChatReply });

/** A `final` event as the API sends it (raw blocks), read the way the app reads it: broken or unsafe blocks are dropped. */
export const apiReply = (text: string, ...rawBlocks: unknown[]): ChatEvent => ({ type: "final", reply: normalizeReply({ text, blocks: rawBlocks }) });

/** Cards for these offers. */
export const offersBlock = (...jobs: (Job | ChatOffer)[]): ChatBlock => ({
  type: "offers",
  offers: jobs.map((job) => toChatOffer({ description: "", url: null, is_new: false, last_updated: null, ...job } as Job)),
});

/** Buttons that open pages of the site: `["/jobs", "Offers"]`. */
export const linksBlock = (...links: [path: string, label: string][]): ChatBlock => ({
  type: "links",
  buttons: links.map(([path, label]) => ({ label, action: { type: "navigate", path } })),
});

/** Quick replies. */
export const quickReplies = (...labels: string[]): ChatBlock => ({
  type: "suggestions",
  buttons: labels.map((label) => ({ label, action: { type: "send", text: label } })),
});

/** What a test asked the API for on its n-th call (the request object of `streamChat`). */
export const requestOf = (spy: { mock: { calls: unknown[][] } }, n = 0) => spy.mock.calls[n][0] as import("../../../src/api/chat").ChatStreamRequest;

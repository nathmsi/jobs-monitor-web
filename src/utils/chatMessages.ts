import type { ChatApiMessage, ChatLink, ChatOffer } from "../api/chat";

/** One bubble of the conversation, as shown. */
export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant only: offers shown as cards under the text. */
  offers?: ChatOffer[];
  /** Assistant only: buttons that open a page of the site. */
  links?: ChatLink[];
  /** Assistant only: quick replies. */
  suggestions?: string[];
}

/** What the API accepts (see the backend's ChatRequestDto). */
export const MAX_API_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

/**
 * The conversation as the API wants it: the most recent messages, starting with the user,
 * with no empty message. A reply that was only cards is sent as a short note, never as
 * the offers' own text (that is data from the web, not something the assistant said).
 */
export function toApiMessages(items: readonly ChatItem[]): ChatApiMessage[] {
  const messages = items
    .map((item): ChatApiMessage => ({
      role: item.role,
      content: (item.content.trim() || (item.offers?.length ? `[Showed ${item.offers.length} offers]` : "")).slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content);

  const recent = messages.slice(-MAX_API_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

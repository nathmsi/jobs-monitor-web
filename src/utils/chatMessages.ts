import type { ChatApiMessage } from "../api/chat";
import { summarizeBlocks } from "../components/Chat/blocks/models";
import type { ChatBlock } from "../components/Chat/blocks/types";

/** One bubble of the conversation, as shown. */
export interface ChatItem {
  id: string;
  role: "user" | "assistant";
  content: string;
  /** Assistant only: what is drawn under the text (offers, buttons…). Empty for the user and for a plain answer. */
  blocks: ChatBlock[];
}

/** What the API accepts (see the backend's ChatRequestDto). */
export const MAX_API_MESSAGES = 20;
export const MAX_MESSAGE_CHARS = 2000;

/**
 * The conversation as the API wants it: the most recent messages, starting with the user,
 * with no empty message. A reply that was only blocks is sent as the short note each kind gives
 * of itself ("[Showed 3 offers]"), never as the offers' own text (data from the web).
 */
export function toApiMessages(items: readonly ChatItem[]): ChatApiMessage[] {
  const messages = items
    .map((item): ChatApiMessage => ({
      role: item.role,
      content: (item.content.trim() || summarizeBlocks(item.blocks)).slice(0, MAX_MESSAGE_CHARS),
    }))
    .filter((m) => m.content);

  const recent = messages.slice(-MAX_API_MESSAGES);
  const firstUser = recent.findIndex((m) => m.role === "user");
  return firstUser === -1 ? [] : recent.slice(firstUser);
}

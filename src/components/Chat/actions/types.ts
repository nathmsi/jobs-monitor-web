/**
 * What a button of the chat can DO. Blocks never act on their own: a button carries one of these,
 * and `runChatAction` does it in a single place. To add an action: a variant here, a handler in
 * runAction.ts (the compiler lists what is missing).
 */
export type ChatAction =
  /** Open a page of the site. */
  | { type: "navigate"; path: string }
  /** Send this text to the assistant, as if the user had typed it. */
  | { type: "send"; text: string }
  /** Open an offer's own page. */
  | { type: "open-offer"; source: string; externalId: string; title: string };

export type ChatActionType = ChatAction["type"];

/** A button of the chat: what it says, and what it does. */
export interface ChatButton {
  label: string;
  action: ChatAction;
}

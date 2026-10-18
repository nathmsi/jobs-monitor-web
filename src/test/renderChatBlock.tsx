import { vi } from "vitest";
import type { ReactElement } from "react";

import type { ChatAction } from "../components/Chat/actions/types";
import { ChatContext, type ChatContextValue } from "../providers/chat/ChatContext";
import { renderWithProviders } from "./renderWithProviders";

/**
 * Renders a piece of the chat on its own, with a chat context whose `act` is a spy: a block can be
 * tested for what it asks to be done, without a router, a conversation or a window.
 */
export function renderChatPart(ui: ReactElement, context: Partial<ChatContextValue> = {}) {
  const act = vi.fn<(action: ChatAction) => void>();
  const value: ChatContextValue = {
    page: { kind: "home" },
    config: { sharing: false, locale: "en" },
    act,
    ...context,
  };
  const rendered = renderWithProviders(<ChatContext.Provider value={value}>{ui}</ChatContext.Provider>);
  return { ...rendered, act: value.act as typeof act };
}

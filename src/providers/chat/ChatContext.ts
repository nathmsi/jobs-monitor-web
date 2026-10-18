import { createContext } from "react";

import type { ChatAction } from "../../components/Chat/actions/types";
import type { ChatPage } from "../../utils/chatPage";

/** What the chat knows about how it is configured. */
export interface ChatConfig {
  /** The user lets the assistant use their CV and profile. */
  sharing: boolean;
  /** The language of the interface. */
  locale: string;
}

/** What every part of the chat can know, and do: where the user is, how it is set up, and actions. */
export interface ChatContextValue {
  page: ChatPage;
  config: ChatConfig;
  /** Do what a button asks. The only way a block acts: it knows no router and no chat state. */
  act: (action: ChatAction) => void;
}

export const ChatContext = createContext<ChatContextValue | null>(null);

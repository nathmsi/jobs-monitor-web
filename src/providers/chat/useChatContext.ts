import { useContext } from "react";

import { ChatContext, type ChatContextValue } from "./ChatContext";

export function useChatContext(): ChatContextValue {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider");
  return ctx;
}

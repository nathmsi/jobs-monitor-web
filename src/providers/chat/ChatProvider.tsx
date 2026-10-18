import { useCallback, useMemo, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { runChatAction } from "../../components/Chat/actions/runAction";
import type { ChatAction } from "../../components/Chat/actions/types";
import type { ChatPage } from "../../utils/chatPage";
import { useJobFlags } from "../jobFlags/useJobFlags";
import { ChatContext, type ChatContextValue } from "./ChatContext";

interface Props {
  page: ChatPage;
  sharing: boolean;
  /** Sends a message to the assistant. */
  send: (text: string) => void;
  /** The chat just sent the user to a page. */
  onNavigated: () => void;
  children: ReactNode;
}

/**
 * Gives the chat's blocks and windows what they need without passing it down every level: the page
 * the user is on, the configuration, and `act`, which carries out a button's action with the real
 * router, the chat and the seen-offers flags.
 */
export function ChatProvider({ page, sharing, send, onNavigated, children }: Props) {
  const navigate = useNavigate();
  const { markOpened } = useJobFlags();
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const act = useCallback(
    (action: ChatAction) => runChatAction(action, { navigate: (path) => navigate(path), send, markOpened, afterNavigate: onNavigated }),
    [navigate, send, markOpened, onNavigated],
  );

  const value = useMemo<ChatContextValue>(() => ({ page, config: { sharing, locale }, act }), [page, sharing, locale, act]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

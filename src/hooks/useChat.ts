import { useCallback, useEffect, useReducer, useRef } from "react";
import { useTranslation } from "react-i18next";

import { streamChat, toChatOffer, type ChatShared } from "../api/chat";
import { toApiMessages, type ChatItem } from "../utils/chatMessages";
import { chatReducer, initialChatState } from "../utils/chatReducer";
import { loadChat, saveChat } from "../utils/chatStorage";

let counter = 0;
const nextId = (): string => `${Date.now().toString(36)}-${(counter++).toString(36)}`;

/**
 * The chat's logic, with no UI: the conversation, the request to the assistant (streamed),
 * the progress step, retry and reset. The conversation lives in this tab's sessionStorage.
 */
export function useChat(shared: ChatShared | null = null) {
  const { i18n } = useTranslation();
  const locale = i18n.resolvedLanguage ?? i18n.language;

  const [state, dispatch] = useReducer(chatReducer, undefined, () => initialChatState(loadChat()));
  const abortRef = useRef<AbortController | null>(null);
  // The latest choice is sent with every question, without making `ask` change when it does.
  const sharedRef = useRef(shared);
  useEffect(() => {
    sharedRef.current = shared;
  }, [shared]);

  useEffect(() => saveChat(state.items), [state.items]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const ask = useCallback(
    async (items: readonly ChatItem[]) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      let answered = false;
      try {
        for await (const event of streamChat(toApiMessages(items), locale, controller.signal, sharedRef.current)) {
          if (event.type === "tool_call") dispatch({ type: "step", name: event.name });
          else if (event.type === "final") {
            answered = true;
            const { text, offers, links, suggestions } = event.reply;
            dispatch({
              type: "replied",
              item: { id: nextId(), role: "assistant", content: text, offers: offers.map(toChatOffer), links: links ?? [], suggestions },
            });
          } else if (event.type === "error") break;
        }
      } catch {
        if (controller.signal.aborted) return;
      }
      if (!answered && !controller.signal.aborted) dispatch({ type: "failed" });
    },
    [locale],
  );

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || state.status === "thinking") return;
      const item: ChatItem = { id: nextId(), role: "user", content };
      dispatch({ type: "sent", item });
      void ask([...state.items, item]);
    },
    [ask, state.items, state.status],
  );

  const retry = useCallback(() => {
    if (state.status !== "error") return;
    dispatch({ type: "retry" });
    void ask(state.items);
  }, [ask, state.items, state.status]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    dispatch({ type: "reset" });
  }, []);

  return { items: state.items, status: state.status, step: state.step, send, retry, reset };
}

export type ChatController = ReturnType<typeof useChat>;

import type { ChatItem } from "./chatMessages";

export type ChatStatus = "idle" | "thinking" | "error";

export interface ChatState {
  items: ChatItem[];
  status: ChatStatus;
  /** The tool the assistant is running now (for the progress line), while thinking. */
  step: string | null;
}

export type ChatAction =
  | { type: "sent"; item: ChatItem }
  | { type: "step"; name: string }
  | { type: "replied"; item: ChatItem }
  | { type: "failed" }
  | { type: "retry" }
  | { type: "reset" };

export function initialChatState(items: ChatItem[] = []): ChatState {
  return { items, status: "idle", step: null };
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "sent":
      return { items: [...state.items, action.item], status: "thinking", step: null };
    case "step":
      return state.status === "thinking" ? { ...state, step: action.name } : state;
    case "replied":
      return { items: [...state.items, action.item], status: "idle", step: null };
    case "failed":
      return { ...state, status: "error", step: null };
    case "retry":
      return state.status === "error" ? { ...state, status: "thinking", step: null } : state;
    case "reset":
      return initialChatState();
  }
}

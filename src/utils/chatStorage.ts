import type { ChatItem } from "./chatMessages";

const KEY = "jobs-monitor.chat";
/** A long conversation is cut when stored: the API only reads the recent part anyway. */
const MAX_STORED = 40;

function isItem(v: unknown): v is ChatItem {
  if (typeof v !== "object" || v === null) return false;
  const r = v as Record<string, unknown>;
  return typeof r.id === "string" && (r.role === "user" || r.role === "assistant") && typeof r.content === "string";
}

/** The conversation of this tab (it survives a reload, not a new session). Never throws. */
export function loadChat(): ChatItem[] {
  try {
    const raw = sessionStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter(isItem) : [];
  } catch {
    return [];
  }
}

export function saveChat(items: readonly ChatItem[]): void {
  try {
    if (items.length === 0) sessionStorage.removeItem(KEY);
    else sessionStorage.setItem(KEY, JSON.stringify(items.slice(-MAX_STORED)));
  } catch {
    // Storage full or blocked: the chat still works, it just is not kept.
  }
}

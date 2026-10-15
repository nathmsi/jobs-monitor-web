const KEY = "jobs-monitor.chat.prefs";

export type ChatSize = "compact" | "large";

export interface ChatPrefs {
  /** Window size on a desktop. */
  size: ChatSize;
  /** The user lets the assistant use their CV and profile. Off until they say so. */
  share: boolean;
}

export const DEFAULT_PREFS: ChatPrefs = { size: "compact", share: false };

/** The chat's remembered choices (this browser). Never throws. */
export function loadChatPrefs(): ChatPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const p = parsed as Record<string, unknown>;
    return { size: p.size === "large" ? "large" : "compact", share: p.share === true };
  } catch {
    return DEFAULT_PREFS;
  }
}

export function saveChatPrefs(prefs: ChatPrefs): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch {
    // Storage full or blocked: the choice just is not remembered.
  }
}

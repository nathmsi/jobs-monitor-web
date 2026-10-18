import { DOCK_DEFAULT_WIDTH, DOCK_MAX_WIDTH, DOCK_MIN_WIDTH, parseFrame, type Frame } from "./chatFrame";

const KEY = "jobs-monitor.chat.prefs";

export interface ChatPrefs {
  /** Where the user put the window and how big they made it (desktop). Null: the default place. */
  frame: Frame | null;
  /** The user lets the assistant use their CV and profile. Off until they say so. */
  share: boolean;
  /** The window is docked to the side of the screen (desktop, when there is room) instead of floating. */
  dock: boolean;
  /** How wide the docked panel is. */
  dockWidth: number;
}

/** Docked by default: a side panel next to the page. The user can pull it off and move it, and it remembers. */
export const DEFAULT_PREFS: ChatPrefs = { frame: null, share: false, dock: true, dockWidth: DOCK_DEFAULT_WIDTH };

/** The chat's remembered choices (this browser). Never throws. */
export function loadChatPrefs(): ChatPrefs {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (typeof parsed !== "object" || parsed === null) return DEFAULT_PREFS;
    const p = parsed as Record<string, unknown>;
    const width = typeof p.dockWidth === "number" && Number.isFinite(p.dockWidth) ? p.dockWidth : DOCK_DEFAULT_WIDTH;
    return {
      frame: parseFrame(p.frame),
      share: p.share === true,
      dock: typeof p.dock === "boolean" ? p.dock : DEFAULT_PREFS.dock,
      dockWidth: Math.min(Math.max(Math.round(width), DOCK_MIN_WIDTH), DOCK_MAX_WIDTH),
    };
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

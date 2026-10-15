import { useCallback, useEffect, useState } from "react";

import { loadChatPrefs, saveChatPrefs, type ChatPrefs } from "../utils/chatPrefs";

/** The chat's remembered choices: window size on desktop, and whether the CV is shared. */
export function useChatPrefs() {
  const [prefs, setPrefs] = useState<ChatPrefs>(loadChatPrefs);
  useEffect(() => saveChatPrefs(prefs), [prefs]);

  const update = useCallback((patch: Partial<ChatPrefs>) => setPrefs((prev) => ({ ...prev, ...patch })), []);
  return { prefs, update };
}

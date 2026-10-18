import { useCallback } from "react";

import { DOCK_MIN_VIEWPORT } from "../utils/chatFrame";
import type { ChatPrefs } from "../utils/chatPrefs";
import { useMediaQuery } from "./useMediaQuery";

/**
 * Whether the chat is docked to the side of the screen: the user's choice (remembered), but only while
 * there is room for it. On a narrow desktop the window stays floating whatever was chosen, and goes back
 * to the dock when the screen is wide enough again.
 */
export function useChatDock(dock: boolean, dockWidth: number, update: (patch: Partial<ChatPrefs>) => void) {
  const canDock = useMediaQuery(`(min-width: ${DOCK_MIN_VIEWPORT}px)`);
  const setDocked = useCallback((on: boolean) => update({ dock: on }), [update]);
  const setWidth = useCallback((width: number) => update({ dockWidth: width }), [update]);
  return { canDock, docked: dock && canDock, width: dockWidth, setDocked, setWidth };
}

export type ChatDock = ReturnType<typeof useChatDock>;

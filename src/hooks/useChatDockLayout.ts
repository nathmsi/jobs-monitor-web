import { useCallback, useEffect, useLayoutEffect, useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import { clampDockWidth, dockWidthFromPointer } from "../utils/chatFrame";

const KEY_STEP = 16;
/** How far the pointer must travel with the header held before the panel comes off the side. */
const DETACH_DISTANCE = 8;
const rtl = (): boolean => document.documentElement.dir === "rtl";

interface Options {
  docked: boolean;
  width: number;
  onWidth: (width: number) => void;
}

/**
 * The DOM side of the docked panel. While it is docked it writes `data-chat-dock` and `--chat-dock-width` on
 * <html>: the stylesheet pushes the page by that much (the chat sits next to the page, not on top of it) and
 * moves the launcher out of the way. Dragging the inner edge changes the width live, and it is remembered on
 * release; Alt+arrows do the same from the keyboard (the arrow that moves the edge toward the page widens it).
 */
export function useChatDockLayout({ docked, width, onWidth }: Options) {
  const gesture = useRef<(() => void) | null>(null);

  useLayoutEffect(() => {
    if (!docked) return;
    const root = document.documentElement;
    const apply = () => root.style.setProperty("--chat-dock-width", `${clampDockWidth(width, window.innerWidth)}px`);
    root.dataset.chatDock = "";
    apply();
    window.addEventListener("resize", apply); // the screen got narrower: half of it is the most the chat may take
    return () => {
      window.removeEventListener("resize", apply);
      delete root.dataset.chatDock;
      root.style.removeProperty("--chat-dock-width");
    };
  }, [docked, width]);

  useEffect(() => () => gesture.current?.(), []);

  const startResize = useCallback(
    (e: ReactPointerEvent) => {
      if (!docked || e.button !== 0) return;
      e.preventDefault();
      gesture.current?.();
      const root = document.documentElement;
      let latest = clampDockWidth(width, window.innerWidth);

      const move = (ev: PointerEvent) => {
        latest = dockWidthFromPointer(ev.clientX, window.innerWidth, rtl());
        root.style.setProperty("--chat-dock-width", `${latest}px`);
      };
      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        gesture.current = null;
        if (latest !== clampDockWidth(width, window.innerWidth)) onWidth(latest);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      gesture.current = end;
    },
    [docked, width, onWidth],
  );

  /**
   * A press on the header of the docked panel that turns into a drag: the panel lets go of the side and
   * becomes a floating window under the pointer (`onDetach`). A press that does not move is just a click.
   */
  const startDetach = useCallback(
    (e: ReactPointerEvent, onDetach: (pointer: { x: number; y: number }) => void) => {
      if (!docked || e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
      gesture.current?.();
      const from = { x: e.clientX, y: e.clientY };

      const move = (ev: PointerEvent) => {
        if (Math.hypot(ev.clientX - from.x, ev.clientY - from.y) < DETACH_DISTANCE) return;
        end();
        onDetach({ x: ev.clientX, y: ev.clientY });
      };
      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        gesture.current = null;
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      gesture.current = end;
    },
    [docked],
  );

  /** Alt+Left / Alt+Right. True when the key was ours. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      if (!docked || !e.altKey || (e.key !== "ArrowLeft" && e.key !== "ArrowRight")) return false;
      e.preventDefault();
      // The panel is at the end side: in LTR (right) the left arrow widens it, in RTL (left) the right one.
      const towardPage = (e.key === "ArrowLeft") !== rtl();
      onWidth(clampDockWidth(clampDockWidth(width, window.innerWidth) + (towardPage ? KEY_STEP : -KEY_STEP), window.innerWidth));
      return true;
    },
    [docked, width, onWidth],
  );

  return { startResize, startDetach, onKeyDown };
}

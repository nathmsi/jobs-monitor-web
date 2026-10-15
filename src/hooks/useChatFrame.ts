import { useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from "react";

import {
  clampFrame, defaultFrame, isLargeFrame, moveFrame, resizeFrame, sameFrame, toggleSize,
  type Frame, type Handle, type Viewport,
} from "../utils/chatFrame";

/** The desktop layout starts here (the phone's window is always full screen). */
const DESKTOP = "(min-width: 641px)";
const KEY_STEP = 16;

const viewport = (): Viewport => ({ width: window.innerWidth, height: window.innerHeight });
const isDesktop = (): boolean => window.matchMedia(DESKTOP).matches;

function rectOf(el: HTMLElement): Frame {
  const r = el.getBoundingClientRect();
  return { left: r.left, top: r.top, width: r.width, height: r.height };
}

/**
 * Written straight to the element while the pointer moves (no React render per pixel).
 * The stylesheet reads these variables when the window has a frame (`data-framed`).
 */
function paint(el: HTMLElement, frame: Frame | null): void {
  if (!frame) {
    el.removeAttribute("data-framed");
    for (const name of ["left", "top", "width", "height"]) el.style.removeProperty(`--chat-${name}`);
    return;
  }
  el.dataset.framed = "true";
  el.style.setProperty("--chat-left", `${frame.left}px`);
  el.style.setProperty("--chat-top", `${frame.top}px`);
  el.style.setProperty("--chat-width", `${frame.width}px`);
  el.style.setProperty("--chat-height", `${frame.height}px`);
}

interface Options {
  /** Where the user left the window, or null for the default place. */
  frame: Frame | null;
  onCommit: (frame: Frame | null) => void;
}

/**
 * Move and resize the chat window on a desktop: drag the header, drag a handle, or use the
 * keyboard (Alt+arrows move, Alt+Shift+arrows resize). The window stays on screen, below the
 * sticky header. Double-click the header, or the "reset" of the keyboard, puts it back.
 */
export function useChatFrame({ frame, onCommit }: Options) {
  const panelRef = useRef<HTMLElement>(null);
  const [dragging, setDragging] = useState(false);
  const gesture = useRef<(() => void) | null>(null);

  // Paint the stored frame (clamped: the screen may be smaller than last time).
  useLayoutEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    if (!frame || !isDesktop()) return paint(el, null);
    const fitted = clampFrame(frame, viewport());
    paint(el, fitted);
    if (!sameFrame(fitted, frame)) onCommit(fitted);
  }, [frame, onCommit]);

  // The browser window was resized: keep the chat on screen.
  useEffect(() => {
    const onResize = () => {
      const el = panelRef.current;
      if (!el || !frame || !isDesktop()) return;
      const fitted = clampFrame(frame, viewport());
      paint(el, fitted);
      if (!sameFrame(fitted, frame)) onCommit(fitted);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [frame, onCommit]);

  useEffect(() => () => gesture.current?.(), []);

  /** One pointer gesture: `next` turns the distance travelled into the new frame, live. */
  const begin = useCallback(
    (e: ReactPointerEvent, next: (start: Frame, dx: number, dy: number, vp: Viewport) => Frame) => {
      const el = panelRef.current;
      if (!el || e.button !== 0 || !isDesktop()) return;
      e.preventDefault();

      gesture.current?.();
      const start = rectOf(el);
      const vp = viewport();
      const from = { x: e.clientX, y: e.clientY };
      let latest = start;
      setDragging(true);

      const move = (ev: PointerEvent) => {
        latest = next(start, ev.clientX - from.x, ev.clientY - from.y, vp);
        paint(el, latest);
      };
      const end = () => {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
        gesture.current = null;
        setDragging(false);
        if (sameFrame(latest, start)) return;
        onCommit(latest);
      };
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
      gesture.current = end;
    },
    [onCommit],
  );

  const startMove = useCallback(
    (e: ReactPointerEvent) => {
      // A button of the header is a button, not a handle.
      if ((e.target as HTMLElement).closest("button")) return;
      begin(e, (start, dx, dy, vp) => moveFrame(start, dx, dy, vp));
    },
    [begin],
  );

  const startResize = useCallback(
    (handle: Handle) => (e: ReactPointerEvent) => begin(e, (start, dx, dy, vp) => resizeFrame(start, handle, dx, dy, vp)),
    [begin],
  );

  const reset = useCallback(() => onCommit(null), [onCommit]);

  const toggle = useCallback(() => {
    const el = panelRef.current;
    if (!el) return;
    // The stored frame is what the user sees; without one, the window is where the stylesheet put it.
    const current = frame ?? (isDesktop() ? rectOf(el) : defaultFrame(viewport(), "compact"));
    onCommit(toggleSize(current, viewport()));
  }, [frame, onCommit]);

  /** Alt+arrows move, Alt+Shift+arrows resize from the bottom-right corner. True when it was ours. */
  const onKeyDown = useCallback(
    (e: KeyboardEvent): boolean => {
      const el = panelRef.current;
      if (!el || !e.altKey || !isDesktop()) return false;
      const step = { ArrowLeft: [-KEY_STEP, 0], ArrowRight: [KEY_STEP, 0], ArrowUp: [0, -KEY_STEP], ArrowDown: [0, KEY_STEP] }[e.key];
      if (!step) return false;
      e.preventDefault();
      const current = rectOf(el);
      const vp = viewport();
      onCommit(e.shiftKey ? resizeFrame(current, "se", step[0], step[1], vp) : moveFrame(current, step[0], step[1], vp));
      return true;
    },
    [onCommit],
  );

  return {
    panelRef,
    framed: frame !== null,
    dragging,
    large: frame ? isLargeFrame(frame) : false,
    startMove,
    startResize,
    reset,
    toggle,
    onKeyDown,
  };
}

export type ChatFrameController = ReturnType<typeof useChatFrame>;

import { useCallback, useEffect, useRef, useState } from "react";

const SMALL_SCREEN = "(max-width: 640px)";

/**
 * Whether the chat window is open, and how it opens and closes: the launcher toggles it, Escape and
 * the close button close it (the focus goes back to the launcher), a click outside closes it (the focus
 * stays where the user clicked), and on a phone it steps aside when it sends the user to a page.
 * Anything that belongs to the chat carries `data-chat-root`: a click there is never "outside".
 */
export function useChatWindow() {
  const [open, setOpen] = useState(false);
  const launcherRef = useRef<HTMLButtonElement>(null);

  const toggle = useCallback(() => setOpen((o) => !o), []);

  const close = useCallback(() => {
    setOpen(false);
    launcherRef.current?.focus();
  }, []);

  // On a phone the window covers the page: when it opens a page, it steps aside.
  const stepAside = useCallback(() => {
    if (window.matchMedia(SMALL_SCREEN).matches) setOpen(false);
  }, []);

  // The window is not modal: it can sit next to the page, and a click on the page is a click on the page.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target;
      if (target instanceof Element && target.isConnected && !target.closest("[data-chat-root]")) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  return { open, toggle, close, stepAside, launcherRef };
}

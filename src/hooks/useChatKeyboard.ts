import { useEffect, type RefObject } from "react";

import { keyboardIsOpen } from "../utils/touchDevice";

/** Phones only: on a desktop the window never moves for a keyboard. */
const PHONE = "(max-width: 640px)";

/**
 * Keeps the chat usable while the on-screen keyboard is up. The window is full screen on a phone, and
 * the keyboard covers its bottom (the message box!) unless the window shrinks to what is visible.
 * Reads the visual viewport and writes `--chat-vh` (its height) and `--chat-top` (its offset, iOS scrolls
 * the page under the keyboard) on the element, and `data-keyboard="open"` so the stylesheet can drop the
 * non-essential lines. Written straight to the element, no render per frame.
 */
export function useChatKeyboard(ref: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    const el = ref.current;
    const viewport = window.visualViewport;
    if (!el || !viewport || !window.matchMedia(PHONE).matches) return;

    const update = () => {
      el.style.setProperty("--chat-vh", `${viewport.height}px`);
      el.style.setProperty("--chat-top", `${viewport.offsetTop}px`);
      if (keyboardIsOpen(window.innerHeight, viewport.height)) el.dataset.keyboard = "open";
      else delete el.dataset.keyboard;
    };

    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      el.style.removeProperty("--chat-vh");
      el.style.removeProperty("--chat-top");
      delete el.dataset.keyboard;
    };
  }, [ref]);
}

/** A screen that is touched, not pointed at: a phone or a tablet. The keyboard that pops up there hides half the screen. */
export function isTouchDevice(): boolean {
  return typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(pointer: coarse)").matches;
}

/** The on-screen keyboard counts as open when the visible area is this much shorter than the window. */
export const KEYBOARD_MIN_HEIGHT = 150;

export function keyboardIsOpen(windowHeight: number, visibleHeight: number): boolean {
  return windowHeight - visibleHeight > KEYBOARD_MIN_HEIGHT;
}

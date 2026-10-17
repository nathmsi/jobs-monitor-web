import type { MouseEvent } from "react";

/** A plain left click. Ctrl/Cmd/Shift/Alt or the middle button mean "in a new tab": the browser keeps them. */
export function isPlainClick(e: Pick<MouseEvent, "button" | "metaKey" | "ctrlKey" | "shiftKey" | "altKey" | "defaultPrevented">): boolean {
  return !e.defaultPrevented && e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}

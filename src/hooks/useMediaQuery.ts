import { useSyncExternalStore } from "react";

/** Whether a media query matches, kept up to date when it changes (a window resized across a breakpoint). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener?.("change", onChange);
      return () => list.removeEventListener?.("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

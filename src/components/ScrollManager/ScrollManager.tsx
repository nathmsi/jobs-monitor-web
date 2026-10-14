import { useEffect, useLayoutEffect, useRef } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

const KEY = "scroll.v1:";
/** How long to wait for a restored page to become tall enough (offers load after the first paint). */
const MAX_WAIT_MS = 1500;

function read(key: string): number {
  try {
    return Number(sessionStorage.getItem(KEY + key)) || 0;
  } catch {
    return 0;
  }
}

function write(key: string, y: number) {
  try {
    sessionStorage.setItem(KEY + key, String(Math.round(y)));
  } catch { /* storage unavailable */ }
}

/**
 * Scroll behaviour for page changes: a new page opens at the top (an offer
 * opened from the bottom of a long list must not start at the bottom), and the
 * back button returns to where the visitor was, even if the list is still loading.
 * Changing only the filters (same page) never moves the scroll.
 */
export function ScrollManager() {
  const { key, pathname } = useLocation();
  const navigationType = useNavigationType();
  const previousPath = useRef<string | null>(null);

  // Remember where this page was left, before its content goes away.
  useLayoutEffect(() => () => write(key, window.scrollY), [key]);

  useEffect(() => {
    const samePage = previousPath.current === pathname;
    previousPath.current = pathname;

    if (navigationType === "POP") {
      const target = read(key);
      if (target <= 0) return;
      const started = performance.now();
      let frame = 0;
      const attempt = () => {
        const reachable = document.documentElement.scrollHeight - window.innerHeight;
        if (reachable >= target || performance.now() - started > MAX_WAIT_MS) {
          window.scrollTo(0, Math.min(target, Math.max(reachable, 0)));
          return;
        }
        frame = requestAnimationFrame(attempt);
      };
      attempt();
      return () => cancelAnimationFrame(frame);
    }

    if (!samePage) window.scrollTo(0, 0);
  }, [key, pathname, navigationType]);

  return null;
}

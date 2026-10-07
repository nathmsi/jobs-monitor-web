import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

import { JobFlagsContext, type JobFlags } from "./JobFlagsContext";

// Per-browser memory of which offers you've opened, plus the "hide seen"
// preference. Stored in localStorage (no backend / no login).

const OPENED_KEY = "jobFlags.opened.v1";
const HIDE_KEY = "jobFlags.hideSeen.v1";
/** Keep the "opened" history bounded so localStorage never grows forever. */
const MAX_OPENED = 2000;

function loadSet(key: string): Set<string> {
  try {
    const raw = localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveSet(key: string, set: Set<string>): void {
  try {
    localStorage.setItem(key, JSON.stringify([...set]));
  } catch {
    /* ignore quota / disabled storage */
  }
}

export function JobFlagsProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<Set<string>>(() => loadSet(OPENED_KEY));
  const [hideSeen, setHideSeenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => saveSet(OPENED_KEY, opened), [opened]);

  const markOpened = useCallback((id: string) => {
    setOpened((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev).add(id);
      // Sets iterate in insertion order: drop the oldest entries first.
      for (const old of next) {
        if (next.size <= MAX_OPENED) break;
        next.delete(old);
      }
      return next;
    });
  }, []);

  const setHideSeen = useCallback((v: boolean) => {
    setHideSeenState(v);
    try {
      localStorage.setItem(HIDE_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo<JobFlags>(
    () => ({ isOpened: (id) => opened.has(id), markOpened, hideSeen, setHideSeen }),
    [opened, hideSeen, markOpened, setHideSeen],
  );

  return <JobFlagsContext.Provider value={value}>{children}</JobFlagsContext.Provider>;
}

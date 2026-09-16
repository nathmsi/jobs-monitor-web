import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// Per-browser memory of which offers you've opened / applied to, plus the
// "hide seen" preference. Stored in localStorage (no backend / no login).

const OPENED_KEY = "jobFlags.opened.v1";
const APPLIED_KEY = "jobFlags.applied.v1";
const HIDE_KEY = "jobFlags.hideSeen.v1";

/** Stable per-offer id. */
export function jobId(source: string, externalId: string): string {
  return `${source}-${externalId}`;
}

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

interface JobFlags {
  isOpened: (id: string) => boolean;
  isApplied: (id: string) => boolean;
  markOpened: (id: string) => void;
  toggleApplied: (id: string) => void;
  hideSeen: boolean;
  setHideSeen: (v: boolean) => void;
  appliedCount: number;
}

const Ctx = createContext<JobFlags | null>(null);

export function JobFlagsProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState<Set<string>>(() => loadSet(OPENED_KEY));
  const [applied, setApplied] = useState<Set<string>>(() => loadSet(APPLIED_KEY));
  const [hideSeen, setHideSeenState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(HIDE_KEY) === "1";
    } catch {
      return false;
    }
  });

  useEffect(() => saveSet(OPENED_KEY, opened), [opened]);
  useEffect(() => saveSet(APPLIED_KEY, applied), [applied]);

  const markOpened = useCallback((id: string) => {
    setOpened((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
  }, []);

  const toggleApplied = useCallback((id: string) => {
    setApplied((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    // Applying implies you've opened it.
    setOpened((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
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
    () => ({
      isOpened: (id) => opened.has(id),
      isApplied: (id) => applied.has(id),
      markOpened,
      toggleApplied,
      hideSeen,
      setHideSeen,
      appliedCount: applied.size,
    }),
    [opened, applied, hideSeen, markOpened, toggleApplied, setHideSeen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useJobFlags(): JobFlags {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useJobFlags must be used within JobFlagsProvider");
  return ctx;
}

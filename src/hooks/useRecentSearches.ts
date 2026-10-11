import { useCallback, useState } from "react";

/** A search the user ran or picked: free text, or a role from the suggestions. */
export interface RecentSearch {
  kind: "text" | "role";
  label: string;
  /** The text searched, or the role key. */
  value: string;
}

const KEY = "recentSearches.v1";
const MAX = 5;

function load(): RecentSearch[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "[]") as unknown;
    if (!Array.isArray(raw)) return [];
    return raw
      .filter(
        (r): r is RecentSearch =>
          !!r && (r.kind === "text" || r.kind === "role") && typeof r.label === "string" && typeof r.value === "string",
      )
      .slice(0, MAX);
  } catch {
    return [];
  }
}

function save(items: RecentSearch[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* ignore quota / disabled storage */
  }
}

/** The last few searches, newest first, kept on this device. */
export function useRecentSearches() {
  const [recent, setRecent] = useState<RecentSearch[]>(load);

  const add = useCallback((item: RecentSearch) => {
    const label = item.label.trim();
    if (!label) return;
    setRecent((prev) => {
      const next = [
        { ...item, label },
        ...prev.filter((r) => !(r.kind === item.kind && r.value.toLowerCase() === item.value.toLowerCase())),
      ].slice(0, MAX);
      save(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setRecent([]);
    save([]);
  }, []);

  return { recent, add, clear };
}

import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import type { Filters } from "../types";
import { usePreferences } from "../providers/preferences/usePreferences";

export type JobsTab = "company" | "agency" | "mine" | "forme";
export type JobsSort = "recent" | "oldest" | "hot";

const TABS: readonly JobsTab[] = ["company", "agency", "mine", "forme"];
const SORTS: readonly JobsSort[] = ["recent", "oldest", "hot"];

export interface JobsUrlState {
  filters: Filters;
  tab: JobsTab;
  sort: JobsSort;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

/** Jobs-page state (filters, tab, sort) kept in the URL query string so it
 *  survives navigation, reloads and can be shared. Anything missing from the
 *  URL falls back to the user's saved preferences. */
export function useJobsUrlState() {
  const { prefs } = usePreferences();
  const [params, setParams] = useSearchParams();

  const read = useCallback(
    (p: URLSearchParams): JobsUrlState => ({
      filters: {
        region: p.get("region") ?? prefs.region ?? "all",
        q: p.get("q") ?? "",
        // key present but empty = "no role"; key absent = preference default
        role: p.has("role") ? p.get("role") || undefined : prefs.roles[0],
        category: p.has("category") ? p.get("category") || undefined : prefs.categories[0],
      },
      tab: oneOf(p.get("tab"), TABS) ?? (prefs.kind === "agency" ? "agency" : "company"),
      sort: oneOf(p.get("sort"), SORTS) ?? "recent",
    }),
    [prefs],
  );

  const state = useMemo(() => read(params), [read, params]);

  const update = useCallback(
    (patch: (prev: JobsUrlState) => JobsUrlState) => {
      setParams(
        (prev) => {
          const current = read(prev);
          const next = patch(current);
          // Nothing changed: keep the URL untouched (no rewrite with defaults).
          if (JSON.stringify(next) === JSON.stringify(current)) return prev;
          const out = new URLSearchParams();
          out.set("region", next.filters.region);
          out.set("role", next.filters.role ?? "");
          out.set("category", next.filters.category ?? "");
          if (next.filters.q) out.set("q", next.filters.q);
          out.set("tab", next.tab);
          if (next.sort !== "recent") out.set("sort", next.sort);
          return out;
        },
        { replace: true },
      );
    },
    [read, setParams],
  );

  const setFilters = useCallback(
    (next: Filters | ((prev: Filters) => Filters)) =>
      update((s) => ({ ...s, filters: typeof next === "function" ? next(s.filters) : next })),
    [update],
  );
  // Browse tabs reset the company category; done in one URL update because
  // consecutive functional updates would each start from the same URL.
  const setTab = useCallback(
    (tab: JobsTab) =>
      update((s) => ({
        ...s,
        tab,
        filters: tab === "company" || tab === "agency" ? { ...s.filters, category: undefined } : s.filters,
      })),
    [update],
  );
  const setSort = useCallback((sort: JobsSort) => update((s) => ({ ...s, sort })), [update]);

  return { ...state, setFilters, setTab, setSort };
}

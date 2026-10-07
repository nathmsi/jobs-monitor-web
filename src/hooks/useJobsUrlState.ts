import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";

import type { Filters } from "../types";
import { usePreferences } from "../providers/preferences/usePreferences";

export type JobsTab = "company" | "agency" | "mine" | "forme";
export type JobsSort = "relevance" | "recent" | "oldest" | "hot";

const TABS: readonly JobsTab[] = ["company", "agency", "mine", "forme"];
const SORTS: readonly JobsSort[] = ["relevance", "recent", "oldest", "hot"];

export interface JobsUrlState {
  filters: Filters;
  tab: JobsTab;
  /** What the list is actually sorted by (the user's choice, else a default). */
  sort: JobsSort;
  /** Explicit choice from the URL, or null while the default applies. */
  sortChoice: JobsSort | null;
}

function oneOf<T extends string>(value: string | null, allowed: readonly T[]): T | undefined {
  return allowed.find((a) => a === value);
}

/** Comma-separated list from a query param ("a,b" → ["a", "b"]). */
function list(value: string | null): string[] {
  return (value ?? "").split(",").map((v) => v.trim()).filter(Boolean);
}

/** Jobs-page state (filters, tab, sort) kept in the URL query string so it
 *  survives navigation, reloads and can be shared. Anything missing from the
 *  URL falls back to the user's saved preferences. While nothing is typed or
 *  selected the list is sorted by newest; as soon as there is a search or a
 *  role it is sorted by relevance, unless the user picked a sort. */
export function useJobsUrlState() {
  const { prefs } = usePreferences();
  const [params, setParams] = useSearchParams();

  const read = useCallback(
    (p: URLSearchParams): JobsUrlState => {
      const filters: Filters = {
        region: p.get("region") ?? prefs.region ?? "all",
        q: p.get("q") ?? "",
        // key present but empty = "no role"; key absent = preference default
        roles: p.has("role") ? list(p.get("role")) : prefs.roles,
        category: p.has("category") ? p.get("category") || undefined : prefs.categories[0],
      };
      const sortChoice = oneOf(p.get("sort"), SORTS) ?? null;
      const searching = filters.q.trim() !== "" || filters.roles.length > 0;
      return {
        filters,
        tab: oneOf(p.get("tab"), TABS) ?? (prefs.kind === "agency" ? "agency" : "company"),
        sort: sortChoice ?? (searching ? "relevance" : "recent"),
        sortChoice,
      };
    },
    [prefs],
  );

  const state = useMemo(() => read(params), [read, params]);

  // react-router passes the params of the last *render* to functional updates,
  // so two updates in quick succession would each start from the same stale
  // URL and the second would undo the first. Track the latest params ourselves.
  const latest = useRef(params);
  useEffect(() => {
    latest.current = params;
  }, [params]);

  const update = useCallback(
    (patch: (prev: JobsUrlState) => JobsUrlState) => {
      const current = read(latest.current);
      const next = patch(current);
      // Nothing changed: keep the URL untouched (no rewrite with defaults).
      if (JSON.stringify(next) === JSON.stringify(current)) return;

      const out = new URLSearchParams();
      out.set("region", next.filters.region);
      out.set("role", next.filters.roles.join(","));
      out.set("category", next.filters.category ?? "");
      if (next.filters.q) out.set("q", next.filters.q);
      out.set("tab", next.tab);
      if (next.sortChoice) out.set("sort", next.sortChoice);

      latest.current = out;
      setParams(out, { replace: true });
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
  const setSort = useCallback(
    (sortChoice: JobsSort) => update((s) => ({ ...s, sortChoice, sort: sortChoice })),
    [update],
  );

  return { ...state, setFilters, setTab, setSort };
}

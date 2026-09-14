import { useQueries, useQuery } from "@tanstack/react-query";

import type { Filters, SourceInfo } from "../types";
import { getRegions, getSources, refreshSource } from "./client";

/** All available sources (fetched once). */
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    staleTime: Infinity,
  });
}

/** Canonical regions for the filter dropdown (fetched once). */
export function useRegions() {
  return useQuery({
    queryKey: ["regions"],
    queryFn: getRegions,
    staleTime: Infinity,
  });
}

// Sources flagged here fetch fresh (bypass the server cache) on their next
// run. The "Rafraîchir" button marks its source before calling refetch().
const forceKeys = new Set<string>();

export function markForceRefresh(key: string) {
  forceKeys.add(key);
}

/**
 * One job query per source, under the current filters. Centralized here so
 * the page can sort sources by result availability. Auto-fetch sources run
 * on mount (served from the 1h server cache); on-demand ones (Malam) fetch
 * only when refetched. A manual refresh forces a fresh fetch.
 */
export function useAllSourceJobs(sources: SourceInfo[], filters: Filters) {
  return useQueries({
    queries: sources.map((source) => ({
      queryKey: ["jobs", source.key, filters],
      queryFn: () => {
        const force = forceKeys.delete(source.key);
        return refreshSource(source.key, filters, force);
      },
      enabled: source.auto_fetch,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });
}

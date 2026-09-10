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

/**
 * One job query per source, under the current filters. Centralized here so
 * the page can sort sources by result availability. Auto-fetch sources run
 * on mount; on-demand ones (Malam) fetch only when refetched.
 */
export function useAllSourceJobs(sources: SourceInfo[], filters: Filters) {
  return useQueries({
    queries: sources.map((source) => ({
      queryKey: ["jobs", source.key, filters],
      queryFn: () => refreshSource(source.key, filters),
      enabled: source.auto_fetch,
      staleTime: 60_000,
      refetchOnWindowFocus: false,
    })),
  });
}

import { useQuery } from "@tanstack/react-query";

import { getSources, refreshSource } from "./client";

/** All available sources (fetched once). */
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: getSources,
    staleTime: Infinity,
  });
}

/**
 * Jobs for a single source. Auto-fetch sources run on mount (`enabled`);
 * on-demand ones (Malam) fetch only when the user hits refresh, which calls
 * `refetch()` — that works even while `enabled` is false.
 */
export function useSourceJobs(key: string, enabled: boolean) {
  return useQuery({
    queryKey: ["jobs", key],
    queryFn: () => refreshSource(key),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

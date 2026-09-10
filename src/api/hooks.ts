import { useQuery } from "@tanstack/react-query";

import type { Filters } from "../types";
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
 * Jobs for a single source under the current filters. The filters are part
 * of the query key, so changing them refetches enabled (auto) sources
 * automatically. On-demand sources (Malam) fetch when the user hits refresh.
 */
export function useSourceJobs(key: string, enabled: boolean, filters: Filters) {
  return useQuery({
    queryKey: ["jobs", key, filters],
    queryFn: () => refreshSource(key, filters),
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

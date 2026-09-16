import { useQuery } from "@tanstack/react-query";

import { getRegionJobs, getRegions, getSources } from "./client";

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

/** Every source's jobs for one region, in a single fetch. */
export function useRegionJobs(region: string) {
  return useQuery({
    queryKey: ["region-jobs", region],
    queryFn: () => getRegionJobs(region),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

import {
  getCounts,
  getJobsPage,
  getRegionJobs,
  getRegions,
  getSources,
  type JobQuery,
} from "./client";

const PAGE_SIZE = 24;

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

/** Every job for one region (full set) — for the "For me" ranking + profile. */
export function useRegionJobs(region: string, enabled = true) {
  return useQuery({
    queryKey: ["region-jobs", region],
    queryFn: () => getRegionJobs(region),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    enabled,
  });
}

/** Paginated offers matching the active filters. Changing any filter changes
 *  the query key, so react-query refetches from page 1 automatically. */
export function useJobsInfinite(
  params: Omit<JobQuery, "limit" | "offset">,
  enabled = true,
) {
  return useInfiniteQuery({
    queryKey: ["jobs", params],
    queryFn: ({ pageParam }) =>
      getJobsPage({ ...params, limit: PAGE_SIZE, offset: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.has_more ? last.offset + last.limit : undefined,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled,
  });
}

/** Offer totals by kind/category for the current filters (tab/category badges). */
export function useCounts(params: { region: string; q?: string; role?: string }) {
  return useQuery({
    queryKey: ["counts", params],
    queryFn: () => getCounts(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

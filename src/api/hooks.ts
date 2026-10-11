import { keepPreviousData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { useDebouncedValue } from "../hooks/useDebouncedValue";

import {
  getJobsPage,
  getPopular,
  getRegionJobs,
  getRegions,
  getSources,
  getStats,
  getSuggestions,
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


/** Headline numbers for the home page; they only change when a scrape runs. */
export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: getStats,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });
}

/** The newest offers across every region, for the home page. */
export function useLatestJobs(limit = 6) {
  return useQuery({
    queryKey: ["latest-jobs", limit],
    queryFn: () => getJobsPage({ region: "all", sort: "recent", limit }),
    select: (page) => page.jobs,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

/** Delay between the last keystroke and the suggestions request. */
const SUGGEST_DELAY_MS = 150;

/**
 * Suggestions for the text typed so far. Debounced, cancels the request that is
 * no longer wanted, and keeps showing the previous list while the next one
 * loads (no flicker).
 */
export function useSuggestions(text: string, enabled = true) {
  const query = useDebouncedValue(text.trim(), SUGGEST_DELAY_MS);
  return useQuery({
    queryKey: ["suggest", query],
    queryFn: ({ signal }) => getSuggestions(query, 8, signal),
    enabled: enabled && query.length > 0,
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
    refetchOnWindowFocus: false,
  });
}

/** The most common roles and technologies (shared by the home page and the search box). */
export function usePopularSearches(limit = 8, enabled = true) {
  return useQuery({
    queryKey: ["popular", limit],
    queryFn: ({ signal }) => getPopular(limit, signal),
    enabled,
    staleTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });
}

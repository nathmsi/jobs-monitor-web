import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "./client";
import { useJobsInfinite, useRegionJobs, useRegions, useSources } from "./hooks";
import type { Job, RegionInfo, SourceInfo } from "../types";

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: qc }, children);
}

const sources: SourceInfo[] = [
  { key: "ness", label: "Ness", kind: "agency", site_url: null, auto_fetch: true },
];
const regions: RegionInfo[] = [
  { key: "all", label_en: "All", label_he: "הכל", label_fr: "Tout" },
  { key: "jerusalem", label_en: "Jerusalem", label_he: "ירושלים", label_fr: "Jérusalem" },
];
function job(partial: Partial<Job>): Job {
  return {
    source: "ness", external_id: "1", title: "Dev", location: "TLV",
    excerpt: "", description: "", url: null, is_hot: false, is_expired: false, last_updated: null, is_new: false,
    ...partial,
  };
}

describe("useSources", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns sources from the API", async () => {
    vi.spyOn(client, "getSources").mockResolvedValue(sources);
    const { result } = renderHook(() => useSources(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(sources);
  });
});

describe("useRegions", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns regions from the API", async () => {
    vi.spyOn(client, "getRegions").mockResolvedValue(regions);
    const { result } = renderHook(() => useRegions(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(regions);
  });
});

describe("useRegionJobs", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("returns jobs for the given region", async () => {
    const jobs = [job({ external_id: "42", title: "React Dev" })];
    vi.spyOn(client, "getRegionJobs").mockResolvedValue(jobs);
    const { result } = renderHook(() => useRegionJobs("jerusalem"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(jobs);
  });

  it("surfaces a fetch failure as an error state", async () => {
    vi.spyOn(client, "getRegionJobs").mockRejectedValue(new Error("HTTP 500"));
    const { result } = renderHook(() => useRegionJobs("all"), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe("HTTP 500");
  });

  it("does not fetch when enabled=false", () => {
    const spy = vi.spyOn(client, "getRegionJobs").mockResolvedValue([]);
    renderHook(() => useRegionJobs("all", false), { wrapper: makeWrapper() });
    expect(spy).not.toHaveBeenCalled();
  });
});

describe("useJobsInfinite", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches the first page", async () => {
    const page = { jobs: [job({})], total: 1, limit: 24, offset: 0, has_more: false };
    vi.spyOn(client, "getJobsPage").mockResolvedValue(page);
    const { result } = renderHook(
      () => useJobsInfinite({ region: "all" }),
      { wrapper: makeWrapper() },
    );
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.pages[0]).toEqual(page);
  });

  it("does not fetch when enabled=false", () => {
    const spy = vi.spyOn(client, "getJobsPage").mockResolvedValue({
      jobs: [], total: 0, limit: 24, offset: 0, has_more: false,
    });
    renderHook(() => useJobsInfinite({ region: "all" }, false), { wrapper: makeWrapper() });
    expect(spy).not.toHaveBeenCalled();
  });
});

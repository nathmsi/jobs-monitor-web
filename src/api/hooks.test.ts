import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "./client";
import { useJobsInfinite, usePopularSearches, useRegionJobs, useRegions, useSources, useSuggestions } from "./hooks";
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

describe("useSuggestions", () => {
  const react = [{ type: "skill" as const, label: "React", value: "React", count: 16 }];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });
  afterEach(() => vi.useRealTimers());

  it("waits for the typing to pause, then asks once for the trimmed text", async () => {
    const spy = vi.spyOn(client, "getSuggestions").mockResolvedValue(react);
    const { result, rerender } = renderHook(({ text }) => useSuggestions(text), {
      wrapper: makeWrapper(),
      initialProps: { text: "" },
    });

    rerender({ text: "r" });
    rerender({ text: "re" });
    rerender({ text: " rea " });
    expect(spy).not.toHaveBeenCalled();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await waitFor(() => expect(result.current.data).toEqual(react));
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith("rea", 8, expect.any(AbortSignal));
  });

  it("does not ask for an empty text", async () => {
    const spy = vi.spyOn(client, "getSuggestions").mockResolvedValue([]);
    renderHook(() => useSuggestions("   "), { wrapper: makeWrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("does not ask while disabled (popup closed)", async () => {
    const spy = vi.spyOn(client, "getSuggestions").mockResolvedValue([]);
    renderHook(() => useSuggestions("react", false), { wrapper: makeWrapper() });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(400);
    });
    expect(spy).not.toHaveBeenCalled();
  });

  it("keeps showing the previous suggestions while the next ones load", async () => {
    const spy = vi.spyOn(client, "getSuggestions").mockResolvedValueOnce(react).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = renderHook(({ text }) => useSuggestions(text), {
      wrapper: makeWrapper(),
      initialProps: { text: "re" },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await waitFor(() => expect(result.current.data).toEqual(react));

    rerender({ text: "rea" });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });

    expect(spy).toHaveBeenCalledTimes(2);
    expect(result.current.data).toEqual(react);
  });

  it("reuses an answer it already has", async () => {
    const spy = vi.spyOn(client, "getSuggestions").mockResolvedValue(react);
    const wrapper = makeWrapper();
    const first = renderHook(() => useSuggestions("react"), { wrapper });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(200);
    });
    await waitFor(() => expect(first.result.current.data).toEqual(react));
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe("usePopularSearches", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("fetches the requested number of popular searches", async () => {
    const popular = [{ type: "role" as const, label: "Backend", value: "backend", count: 130 }];
    const spy = vi.spyOn(client, "getPopular").mockResolvedValue(popular);
    const { result } = renderHook(() => usePopularSearches(6), { wrapper: makeWrapper() });

    await waitFor(() => expect(result.current.data).toEqual(popular));
    expect(spy).toHaveBeenCalledWith(6, expect.any(AbortSignal));
  });

  it("does not fetch when disabled", () => {
    const spy = vi.spyOn(client, "getPopular").mockResolvedValue([]);
    renderHook(() => usePopularSearches(8, false), { wrapper: makeWrapper() });
    expect(spy).not.toHaveBeenCalled();
  });

  it("surfaces a failure as an error state", async () => {
    vi.spyOn(client, "getPopular").mockRejectedValue(new Error("HTTP 503"));
    const { result } = renderHook(() => usePopularSearches(), { wrapper: makeWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

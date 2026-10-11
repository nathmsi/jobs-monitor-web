import { beforeEach, describe, expect, it, vi } from "vitest";

import { filterByKeyword, getJobsPage, getPopular, getRegionJobs, getSources, getStats, getSuggestions } from "./client";
import type { Job } from "../types";

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  });
}

function job(partial: Partial<Job>): Job {
  return {
    source: "matrix",
    external_id: "1",
    title: "",
    location: "",
    excerpt: "",
    description: "",
    url: null,
    is_hot: false,
    is_expired: false,
    last_updated: null,
    is_new: false,
    ...partial,
  };
}

describe("api client (backend API)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("getSources calls the /api/sources endpoint", async () => {
    const data = [{ key: "ness", label: "Ness", kind: "agency", site_url: null, auto_fetch: true }];
    const f = mockFetch(data);
    vi.stubGlobal("fetch", f);
    await expect(getSources()).resolves.toEqual(data);
    expect(String(f.mock.calls[0][0])).toContain("/api/sources");
  });

  it("getRegionJobs calls /api/jobs and returns its jobs", async () => {
    const jobs = [job({ external_id: "1", title: "React Dev" })];
    const f = mockFetch({ region: "jerusalem", count: 1, jobs });
    vi.stubGlobal("fetch", f);
    await expect(getRegionJobs("jerusalem")).resolves.toEqual(jobs);
    expect(String(f.mock.calls[0][0])).toContain("/api/jobs?region=jerusalem");
  });

  it("getRegionJobs rejects when the request fails", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));
    await expect(getRegionJobs("south")).rejects.toThrow(/404/);
  });

  it("filterByKeyword matches ignoring spaces/hyphens", () => {
    const jobs = [
      job({ external_id: "1", title: "Frontend Developer" }),
      job({ external_id: "2", title: "Front-End Engineer" }),
      job({ external_id: "3", title: "Backend Developer" }),
    ];
    expect(filterByKeyword(jobs, "front end").map((j) => j.external_id)).toEqual(["1", "2"]);
  });

  it("filterByKeyword also searches the description", () => {
    const jobs = [
      job({ external_id: "1", title: "Software Engineer", description: "work with Kubernetes and Go" }),
      job({ external_id: "2", title: "Software Engineer", description: "React and Node" }),
    ];
    expect(filterByKeyword(jobs, "kubernetes").map((j) => j.external_id)).toEqual(["1"]);
  });

  it("getSuggestions sends the text (encoded) and the limit, and unwraps the list", async () => {
    const suggestions = [{ type: "skill", label: "C#", value: "C#", count: 18 }];
    const f = mockFetch({ suggestions });
    vi.stubGlobal("fetch", f);
    const ctrl = new AbortController();

    await expect(getSuggestions("c# dev", 5, ctrl.signal)).resolves.toEqual(suggestions);

    const [url, init] = f.mock.calls[0];
    expect(String(url)).toContain("/api/search/suggest?q=c%23+dev&limit=5");
    expect(init.signal).toBe(ctrl.signal);
  });

  it("getSuggestions rejects on an HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 503));
    await expect(getSuggestions("re")).rejects.toThrow(/503/);
  });

  it("getPopular asks for the given number and unwraps the list", async () => {
    const popular = [{ type: "role", label: "Backend", value: "backend", count: 130 }];
    const f = mockFetch({ popular });
    vi.stubGlobal("fetch", f);

    await expect(getPopular(6)).resolves.toEqual(popular);
    expect(String(f.mock.calls[0][0])).toContain("/api/search/popular?limit=6");
  });

  it("getPopular rejects on an HTTP error", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 500));
    await expect(getPopular()).rejects.toThrow(/500/);
  });

  it("getJobsPage sends the 'added' window", async () => {
    const f = mockFetch({ jobs: [], total: 0, limit: 24, offset: 0, has_more: false });
    vi.stubGlobal("fetch", f);

    await getJobsPage({ region: "all", posted: "7d", limit: 24 });

    expect(String(f.mock.calls[0][0])).toContain("posted=7d");
  });

  it("getJobsPage omits the window when there is none", async () => {
    const f = mockFetch({ jobs: [], total: 0, limit: 24, offset: 0, has_more: false });
    vi.stubGlobal("fetch", f);

    await getJobsPage({ region: "all", limit: 24 });

    expect(String(f.mock.calls[0][0])).not.toContain("posted");
  });

  it("getStats returns the numbers and when the data was last updated", async () => {
    const stats = { total: 692, new_this_week: 162, companies: 137, updated_at: "2026-10-11T06:15:16.410Z" };
    vi.stubGlobal("fetch", mockFetch(stats));
    await expect(getStats()).resolves.toEqual(stats);
  });
});

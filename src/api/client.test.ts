import { beforeEach, describe, expect, it, vi } from "vitest";

import { filterByKeyword, getRegionJobs, getSources } from "./client";
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

  it("getRegionJobs returns [] when the request fails", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));
    await expect(getRegionJobs("south")).resolves.toEqual([]);
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
});

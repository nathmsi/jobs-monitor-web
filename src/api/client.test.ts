import { beforeEach, describe, expect, it, vi } from "vitest";

import { getRegions, getSources, refreshSource } from "./client";

function mockFetch(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    statusText: ok ? "OK" : "Error",
    json: async () => body,
  });
}

describe("api client (static data)", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("getSources reads /data/sources.json", async () => {
    const data = [{ key: "ness", label: "Ness", site_url: null, auto_fetch: true }];
    const f = mockFetch(data);
    vi.stubGlobal("fetch", f);

    await expect(getSources()).resolves.toEqual(data);
    expect(f.mock.calls[0][0]).toBe("/data/sources.json");
  });

  it("getRegions reads /data/regions.json", async () => {
    const f = mockFetch([]);
    vi.stubGlobal("fetch", f);
    await getRegions();
    expect(f.mock.calls[0][0]).toBe("/data/regions.json");
  });

  it("refreshSource reads the source+region file", async () => {
    const f = mockFetch({ source: "matrix", count: 0, new_count: 0, jobs: [], cached: true });
    vi.stubGlobal("fetch", f);
    await refreshSource("matrix", { region: "jerusalem", q: "" });
    expect(f.mock.calls[0][0]).toBe("/data/matrix__jerusalem.json");
  });

  it("refreshSource filters by keyword client-side", async () => {
    const jobs = [
      { source: "matrix", external_id: "1", title: "React Dev", location: "", excerpt: "", url: null, is_hot: false, last_updated: null, is_new: true },
      { source: "matrix", external_id: "2", title: "Java Dev", location: "", excerpt: "", url: null, is_hot: false, last_updated: null, is_new: false },
    ];
    vi.stubGlobal("fetch", mockFetch({ source: "matrix", count: 2, new_count: 1, jobs, cached: true }));

    const res = await refreshSource("matrix", { region: "all", q: "react" });
    expect(res.count).toBe(1);
    expect(res.jobs[0].external_id).toBe("1");
  });

  it("returns empty when the file is missing", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 404));
    const res = await refreshSource("matrix", { region: "jerusalem", q: "" });
    expect(res.count).toBe(0);
    expect(res.jobs).toEqual([]);
  });
});

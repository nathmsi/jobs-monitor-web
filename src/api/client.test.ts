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

describe("api client", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("getSources calls /api/sources and returns parsed data", async () => {
    const data = [
      { key: "ness", label: "Ness", site_url: null, auto_fetch: true },
    ];
    const f = mockFetch(data);
    vi.stubGlobal("fetch", f);

    await expect(getSources()).resolves.toEqual(data);
    expect(f.mock.calls[0][0]).toContain("/api/sources");
  });

  it("getRegions calls /api/regions", async () => {
    const f = mockFetch([]);
    vi.stubGlobal("fetch", f);
    await getRegions();
    expect(f.mock.calls[0][0]).toContain("/api/regions");
  });

  it("refreshSource encodes region, q and force in the URL", async () => {
    const f = mockFetch({
      source: "ness",
      count: 0,
      new_count: 0,
      jobs: [],
      cached: false,
    });
    vi.stubGlobal("fetch", f);

    await refreshSource("ness", { region: "center", q: "react" }, true);

    const [url, init] = f.mock.calls[0];
    expect(url).toContain("/api/refresh/ness");
    expect(url).toContain("region=center");
    expect(url).toContain("q=react");
    expect(url).toContain("force=true");
    expect(init.method).toBe("POST");
  });

  it("throws on a non-ok response", async () => {
    vi.stubGlobal("fetch", mockFetch({}, false, 500));
    await expect(getSources()).rejects.toThrow();
  });
});

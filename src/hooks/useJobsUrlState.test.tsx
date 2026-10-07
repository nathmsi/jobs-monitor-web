import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const prefs = { region: "tlv", kind: "agency", roles: ["frontend", "mobile"], categories: [] as string[] };
vi.mock("../providers/preferences/usePreferences", () => ({ usePreferences: () => ({ prefs }) }));

import { useJobsUrlState } from "./useJobsUrlState";

function setup(initial = "/") {
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(MemoryRouter, { initialEntries: [initial] }, children);
  return renderHook(() => ({ s: useJobsUrlState(), loc: useLocation() }), { wrapper });
}

describe("useJobsUrlState", () => {
  it("falls back to saved preferences when the URL is empty", () => {
    const { result } = setup();
    expect(result.current.s.filters).toEqual({
      region: "tlv", q: "", roles: ["frontend", "mobile"], category: undefined,
    });
    expect(result.current.s.tab).toBe("agency");
    // A role is active, so results are ranked by relevance until the user picks a sort.
    expect(result.current.s.sort).toBe("relevance");
    expect(result.current.s.sortChoice).toBeNull();
  });

  it("reads values from the URL and ignores invalid tab/sort", () => {
    const { result } = setup("/?region=all&role=&q=react&tab=nope&sort=hot");
    expect(result.current.s.filters).toMatchObject({ region: "all", q: "react", roles: [] });
    expect(result.current.s.tab).toBe("agency");
    expect(result.current.s.sort).toBe("hot");
  });

  it("reads and writes several roles as a comma-separated list", () => {
    const { result } = setup("/?role=mobile,backend");
    expect(result.current.s.filters.roles).toEqual(["mobile", "backend"]);

    act(() => result.current.s.setFilters((f) => ({ ...f, roles: [...f.roles, "qa"] })));
    expect(new URLSearchParams(result.current.loc.search).get("role")).toBe("mobile,backend,qa");

    act(() => result.current.s.setFilters((f) => ({ ...f, roles: [] })));
    expect(new URLSearchParams(result.current.loc.search).get("role")).toBe("");
    expect(result.current.s.filters.roles).toEqual([]);
  });

  it("sorts by newest while nothing is searched, by relevance once something is", () => {
    const empty = setup("/?role=");
    expect(empty.result.current.s.sort).toBe("recent");

    act(() => empty.result.current.s.setFilters((f) => ({ ...f, q: "ios" })));
    expect(empty.result.current.s.sort).toBe("relevance");
    // The default is not written to the URL.
    expect(new URLSearchParams(empty.result.current.loc.search).has("sort")).toBe(false);
  });

  it("keeps an explicit sort choice whatever is searched", () => {
    const { result } = setup("/?role=");
    act(() => result.current.s.setSort("hot"));
    act(() => result.current.s.setFilters((f) => ({ ...f, q: "ios" })));

    expect(result.current.s.sort).toBe("hot");
    expect(new URLSearchParams(result.current.loc.search).get("sort")).toBe("hot");
  });

  it("writes tab and clears the category in a single URL update", () => {
    const { result } = setup("/?category=fintech");
    act(() => result.current.s.setTab("company"));
    const params = new URLSearchParams(result.current.loc.search);
    expect(params.get("tab")).toBe("company");
    expect(params.get("category")).toBe("");
  });

  it("applies functional filter updates on top of the latest URL", () => {
    const { result } = setup();
    act(() => result.current.s.setFilters((f) => ({ ...f, q: "go" })));
    act(() => result.current.s.setFilters((f) => ({ ...f, region: "all" })));
    const params = new URLSearchParams(result.current.loc.search);
    expect(params.get("q")).toBe("go");
    expect(params.get("region")).toBe("all");
  });

  it("does not rewrite the URL when nothing changes", () => {
    const { result } = setup();
    act(() => result.current.s.setFilters((f) => f));
    expect(result.current.loc.search).toBe("");
  });

  it("does not lose an update made right after another one (same tick)", () => {
    const { result } = setup();
    act(() => {
      result.current.s.setTab("company");
      result.current.s.setSort("hot");
      result.current.s.setFilters((f) => ({ ...f, q: "go" }));
    });
    const params = new URLSearchParams(result.current.loc.search);
    expect([params.get("tab"), params.get("sort"), params.get("q")]).toEqual(["company", "hot", "go"]);
  });
});

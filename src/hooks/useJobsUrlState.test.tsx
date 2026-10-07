import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

const prefs = { region: "tlv", kind: "agency", roles: ["frontend"], categories: [] as string[] };
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
      region: "tlv", q: "", role: "frontend", category: undefined,
    });
    expect(result.current.s.tab).toBe("agency");
    expect(result.current.s.sort).toBe("recent");
  });

  it("reads values from the URL and ignores invalid tab/sort", () => {
    const { result } = setup("/?region=all&role=&q=react&tab=nope&sort=hot");
    expect(result.current.s.filters).toMatchObject({ region: "all", q: "react", role: undefined });
    expect(result.current.s.tab).toBe("agency");
    expect(result.current.s.sort).toBe("hot");
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

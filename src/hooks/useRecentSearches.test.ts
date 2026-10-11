import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useRecentSearches } from "./useRecentSearches";

const KEY = "recentSearches.v1";

describe("useRecentSearches", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty", () => {
    expect(renderHook(() => useRecentSearches()).result.current.recent).toEqual([]);
  });

  it("adds newest first and persists", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add({ kind: "text", label: "go", value: "go" }));
    act(() => result.current.add({ kind: "role", label: "Mobile", value: "mobile" }));

    expect(result.current.recent.map((r) => r.label)).toEqual(["Mobile", "go"]);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(2);
  });

  it("moves a repeated search to the top instead of duplicating it (case-insensitive)", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add({ kind: "text", label: "Go", value: "Go" }));
    act(() => result.current.add({ kind: "text", label: "rust", value: "rust" }));
    act(() => result.current.add({ kind: "text", label: "go", value: "go" }));

    expect(result.current.recent.map((r) => r.label)).toEqual(["go", "rust"]);
  });

  it("treats the same word as a role and as text as two different searches", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add({ kind: "text", label: "mobile", value: "mobile" }));
    act(() => result.current.add({ kind: "role", label: "Mobile", value: "mobile" }));
    expect(result.current.recent).toHaveLength(2);
  });

  it("ignores blank labels and caps the list at five", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add({ kind: "text", label: "   ", value: "x" }));
    expect(result.current.recent).toEqual([]);

    for (const q of ["a1", "b2", "c3", "d4", "e5", "f6", "g7"]) {
      act(() => result.current.add({ kind: "text", label: q, value: q }));
    }
    expect(result.current.recent.map((r) => r.label)).toEqual(["g7", "f6", "e5", "d4", "c3"]);
  });

  it("restores from storage and drops malformed entries", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([{ kind: "text", label: "ok", value: "ok" }, { kind: "x", label: 1 }, null, "str"]),
    );
    expect(renderHook(() => useRecentSearches()).result.current.recent).toEqual([{ kind: "text", label: "ok", value: "ok" }]);
  });

  it("survives corrupted or non-array storage", () => {
    localStorage.setItem(KEY, "{nope");
    expect(renderHook(() => useRecentSearches()).result.current.recent).toEqual([]);
    localStorage.setItem(KEY, JSON.stringify({ a: 1 }));
    expect(renderHook(() => useRecentSearches()).result.current.recent).toEqual([]);
  });

  it("clear empties the list and the storage", () => {
    const { result } = renderHook(() => useRecentSearches());
    act(() => result.current.add({ kind: "text", label: "go", value: "go" }));
    act(() => result.current.clear());

    expect(result.current.recent).toEqual([]);
    expect(localStorage.getItem(KEY)).toBe("[]");
  });
});

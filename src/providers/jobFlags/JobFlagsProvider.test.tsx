import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it } from "vitest";

import { JobFlagsProvider } from "./JobFlagsProvider";
import { useJobFlags } from "./useJobFlags";

const wrapper = ({ children }: { children: ReactNode }) => createElement(JobFlagsProvider, null, children);

describe("JobFlagsProvider", () => {
  beforeEach(() => localStorage.clear());

  it("starts empty and remembers opened offers", () => {
    const { result } = renderHook(() => useJobFlags(), { wrapper });
    expect(result.current.isOpened("a-1")).toBe(false);

    act(() => result.current.markOpened("a-1"));

    expect(result.current.isOpened("a-1")).toBe(true);
    expect(JSON.parse(localStorage.getItem("jobFlags.opened.v1") ?? "[]")).toEqual(["a-1"]);
  });

  it("restores opened offers from localStorage", () => {
    localStorage.setItem("jobFlags.opened.v1", JSON.stringify(["x-9"]));
    const { result } = renderHook(() => useJobFlags(), { wrapper });
    expect(result.current.isOpened("x-9")).toBe(true);
  });

  it("survives corrupted storage", () => {
    localStorage.setItem("jobFlags.opened.v1", "{not json");
    const { result } = renderHook(() => useJobFlags(), { wrapper });
    expect(result.current.isOpened("anything")).toBe(false);
  });

  it("keeps the history bounded, dropping the oldest entries", () => {
    const { result } = renderHook(() => useJobFlags(), { wrapper });
    act(() => {
      for (let i = 0; i < 2005; i++) result.current.markOpened(`job-${i}`);
    });

    expect(result.current.isOpened("job-0")).toBe(false);
    expect(result.current.isOpened("job-4")).toBe(false);
    expect(result.current.isOpened("job-5")).toBe(true);
    expect(result.current.isOpened("job-2004")).toBe(true);
    expect(JSON.parse(localStorage.getItem("jobFlags.opened.v1") ?? "[]")).toHaveLength(2000);
  });

  it("persists the 'hide seen' preference", () => {
    const { result, unmount } = renderHook(() => useJobFlags(), { wrapper });
    act(() => result.current.setHideSeen(true));
    unmount();

    const again = renderHook(() => useJobFlags(), { wrapper });
    expect(again.result.current.hideSeen).toBe(true);
  });

  it("throws a helpful error outside the provider", () => {
    expect(() => renderHook(() => useJobFlags())).toThrow(/JobFlagsProvider/);
  });
});

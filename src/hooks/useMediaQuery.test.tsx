import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useMediaQuery } from "./useMediaQuery";

afterEach(() => vi.unstubAllGlobals());

/** A media query that can change, like a window resized across a breakpoint. */
function fakeMedia(initial: boolean) {
  let matches = initial;
  const listeners = new Set<() => void>();
  vi.stubGlobal("matchMedia", () => ({
    get matches() {
      return matches;
    },
    addEventListener: (_t: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_t: string, fn: () => void) => listeners.delete(fn),
  }));
  return {
    set(next: boolean) {
      matches = next;
      listeners.forEach((fn) => fn());
    },
    listeners,
  };
}

describe("useMediaQuery", () => {
  it("is what the query matches now", () => {
    fakeMedia(true);
    expect(renderHook(() => useMediaQuery("(min-width: 900px)")).result.current).toBe(true);
    fakeMedia(false);
    expect(renderHook(() => useMediaQuery("(min-width: 900px)")).result.current).toBe(false);
  });

  it("follows the query when the window crosses the breakpoint", () => {
    const media = fakeMedia(true);
    const { result } = renderHook(() => useMediaQuery("(min-width: 900px)"));

    act(() => media.set(false));
    expect(result.current).toBe(false);
    act(() => media.set(true));
    expect(result.current).toBe(true);
  });

  it("stops listening when the component goes away", () => {
    const media = fakeMedia(true);
    const { unmount } = renderHook(() => useMediaQuery("(min-width: 900px)"));
    expect(media.listeners.size).toBe(1);
    unmount();
    expect(media.listeners.size).toBe(0);
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useDebouncedValue } from "./useDebouncedValue";

describe("useDebouncedValue", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("returns the first value immediately", () => {
    expect(renderHook(() => useDebouncedValue("a", 150)).result.current).toBe("a");
  });

  it("only follows the value after it stops changing", () => {
    const { result, rerender } = renderHook(({ v }) => useDebouncedValue(v, 150), { initialProps: { v: "a" } });

    rerender({ v: "ab" });
    act(() => vi.advanceTimersByTime(100));
    rerender({ v: "abc" });
    act(() => vi.advanceTimersByTime(100));
    expect(result.current).toBe("a");

    act(() => vi.advanceTimersByTime(60));
    expect(result.current).toBe("abc");
  });
});

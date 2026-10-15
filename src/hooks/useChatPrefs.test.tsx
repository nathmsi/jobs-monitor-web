import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";

import { useChatPrefs } from "./useChatPrefs";

beforeEach(() => localStorage.clear());

describe("useChatPrefs", () => {
  it("starts compact and not sharing", () => {
    expect(renderHook(() => useChatPrefs()).result.current.prefs).toEqual({ size: "compact", share: false });
  });

  it("changes one choice at a time, and remembers it for the next visit", () => {
    const first = renderHook(() => useChatPrefs());
    act(() => first.result.current.update({ size: "large" }));
    act(() => first.result.current.update({ share: true }));
    expect(first.result.current.prefs).toEqual({ size: "large", share: true });
    first.unmount();

    expect(renderHook(() => useChatPrefs()).result.current.prefs).toEqual({ size: "large", share: true });
  });
});

import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";

import { useChatPage } from "./useChatPage";

const at = (path: string) => ({ wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter> });

describe("useChatPage", () => {
  it("is the page of the address", () => {
    expect(renderHook(() => useChatPage(), at("/jobs/melio/42/dev")).result.current).toEqual({ kind: "offer", source: "melio", externalId: "42" });
    expect(renderHook(() => useChatPage(), at("/")).result.current).toEqual({ kind: "home" });
  });

  it("is the same object while the route does not change, so nothing re-renders for it", () => {
    const { result, rerender } = renderHook(() => useChatPage(), at("/coach"));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});

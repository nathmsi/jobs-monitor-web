import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatDock } from "./useChatDock";

afterEach(() => vi.unstubAllGlobals());

const screenWide = (wide: boolean) =>
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: wide && query.includes("min-width: 900px"), media: query, addEventListener() {}, removeEventListener() {} }));

describe("useChatDock", () => {
  it("is docked when the user chose it and the screen is wide enough", () => {
    screenWide(true);
    const { result } = renderHook(() => useChatDock(true, 450, vi.fn()));
    expect(result.current).toMatchObject({ canDock: true, docked: true, width: 450 });
  });

  it("is floating when the user did not choose to dock it", () => {
    screenWide(true);
    expect(renderHook(() => useChatDock(false, 420, vi.fn())).result.current).toMatchObject({ canDock: true, docked: false });
  });

  it("stays floating on a narrow desktop whatever was chosen: there is no room", () => {
    screenWide(false);
    expect(renderHook(() => useChatDock(true, 420, vi.fn())).result.current).toMatchObject({ canDock: false, docked: false });
  });

  it("changes the choice and the width through the preferences", () => {
    screenWide(true);
    const update = vi.fn();
    const { result } = renderHook(() => useChatDock(false, 420, update));

    result.current.setDocked(true);
    result.current.setWidth(500);

    expect(update).toHaveBeenNthCalledWith(1, { dock: true });
    expect(update).toHaveBeenNthCalledWith(2, { dockWidth: 500 });
  });
});

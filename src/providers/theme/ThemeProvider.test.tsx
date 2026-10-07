import { act, renderHook } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ThemeProvider } from "./ThemeProvider";
import { useTheme } from "./useTheme";

const wrapper = ({ children }: { children: ReactNode }) => createElement(ThemeProvider, null, children);

describe("ThemeProvider", () => {
  beforeEach(() => document.documentElement.removeAttribute("data-theme"));
  afterEach(() => document.documentElement.removeAttribute("data-theme"));

  it("defaults to system and leaves <html> without data-theme", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });
    expect(result.current.theme).toBe("system");
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("applies and persists an explicit theme, and removes it again for system", () => {
    const { result } = renderHook(() => useTheme(), { wrapper });

    act(() => result.current.setTheme("dark"));
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    act(() => result.current.setTheme("system"));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("restores the stored theme and ignores invalid values", () => {
    localStorage.setItem("theme", "light");
    expect(renderHook(() => useTheme(), { wrapper }).result.current.theme).toBe("light");

    localStorage.setItem("theme", "neon");
    expect(renderHook(() => useTheme(), { wrapper }).result.current.theme).toBe("system");
  });
});

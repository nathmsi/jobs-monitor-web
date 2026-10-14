import { act, render } from "@testing-library/react";
import { useEffect } from "react";
import { MemoryRouter, useNavigate, type To } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ScrollManager } from "./ScrollManager";

const nav: { go?: (to: To | number) => void } = {};
function Probe() {
  const navigate = useNavigate();
  useEffect(() => {
    nav.go = (to) => void (typeof to === "number" ? navigate(to) : navigate(to));
  }, [navigate]);
  return null;
}
const go = (to: To | number) => nav.go?.(to);

function setup() {
  return render(
    <MemoryRouter initialEntries={["/jobs"]}>
      <ScrollManager />
      <Probe />
    </MemoryRouter>,
  );
}

describe("ScrollManager", () => {
  const scrollTo = vi.fn();
  let scrollY = 0;

  beforeEach(() => {
    scrollTo.mockReset();
    scrollY = 0;
    sessionStorage.clear();
    vi.stubGlobal("scrollTo", scrollTo);
    Object.defineProperty(window, "scrollY", { configurable: true, get: () => scrollY });
    Object.defineProperty(document.documentElement, "scrollHeight", { configurable: true, get: () => 5000 });
    Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("opens a new page at the top", () => {
    setup();
    scrollY = 1500;
    act(() => go("/jobs/melio/1/dev"));
    expect(scrollTo).toHaveBeenCalledWith(0, 0);
  });

  it("does not move the scroll when only the filters change", () => {
    setup();
    scrollY = 1500;
    act(() => go("/jobs?q=react"));
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("returns to where the list was left when going back", () => {
    setup();
    scrollY = 1500;
    act(() => go("/jobs/melio/1/dev"));
    scrollTo.mockClear();

    act(() => go(-1));
    expect(scrollTo).toHaveBeenCalledWith(0, 1500);
  });
});

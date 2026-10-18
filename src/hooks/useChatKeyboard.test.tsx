import { act, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatKeyboard } from "./useChatKeyboard";

function Panel() {
  const ref = useRef<HTMLElement>(null);
  useChatKeyboard(ref);
  return <section ref={ref} data-testid="panel" />;
}

/** A visual viewport we can resize, like the browser does when the keyboard comes up. */
function fakeViewport(height: number, offsetTop = 0) {
  const listeners: Record<string, Set<() => void>> = { resize: new Set(), scroll: new Set() };
  const viewport = {
    height,
    offsetTop,
    addEventListener: (type: string, fn: () => void) => listeners[type].add(fn),
    removeEventListener: (type: string, fn: () => void) => listeners[type].delete(fn),
  };
  Object.defineProperty(window, "visualViewport", { configurable: true, value: viewport });
  return {
    viewport,
    listeners,
    change(next: { height?: number; offsetTop?: number }) {
      Object.assign(viewport, next);
      listeners.resize.forEach((fn) => fn());
    },
  };
}

function stubPhone(phone: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: phone && query.includes("max-width: 640px"), media: query }));
}

beforeEach(() => {
  Object.defineProperty(window, "innerHeight", { configurable: true, value: 800 });
  stubPhone(true);
});
afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, "visualViewport", { configurable: true, value: undefined });
});

describe("useChatKeyboard", () => {
  it("gives the window the height that is visible, and no flag while the keyboard is down", () => {
    fakeViewport(800);
    render(<Panel />);
    const panel = screen.getByTestId("panel");
    expect(panel.style.getPropertyValue("--chat-vh")).toBe("800px");
    expect(panel.dataset.keyboard).toBeUndefined();
  });

  it("shrinks the window when the keyboard comes up, and says so", () => {
    const vp = fakeViewport(800);
    render(<Panel />);
    const panel = screen.getByTestId("panel");

    act(() => vp.change({ height: 430 }));
    expect(panel.style.getPropertyValue("--chat-vh")).toBe("430px");
    expect(panel.dataset.keyboard).toBe("open");

    act(() => vp.change({ height: 800 }));
    expect(panel.dataset.keyboard).toBeUndefined();
  });

  it("follows the page being pushed up under the keyboard (iOS)", () => {
    const vp = fakeViewport(430, 0);
    render(<Panel />);
    act(() => vp.change({ offsetTop: 120 }));
    expect(screen.getByTestId("panel").style.getPropertyValue("--chat-top")).toBe("120px");
  });

  it("does nothing on a desktop: the window never moves for a keyboard", () => {
    stubPhone(false);
    const vp = fakeViewport(300);
    render(<Panel />);
    expect(screen.getByTestId("panel").style.getPropertyValue("--chat-vh")).toBe("");
    expect(vp.listeners.resize.size).toBe(0);
  });

  it("does nothing in a browser without a visual viewport", () => {
    expect(() => render(<Panel />)).not.toThrow();
  });

  it("cleans up: no listener and no variable left when the window closes", () => {
    const vp = fakeViewport(430);
    const { unmount } = render(<Panel />);
    const panel = screen.getByTestId("panel");
    expect(vp.listeners.resize.size).toBe(1);

    unmount();
    expect(vp.listeners.resize.size).toBe(0);
    expect(vp.listeners.scroll.size).toBe(0);
    expect(panel.style.getPropertyValue("--chat-vh")).toBe("");
  });
});

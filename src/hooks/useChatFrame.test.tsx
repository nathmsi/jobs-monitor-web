import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Frame } from "../utils/chatFrame";
import { useChatFrame } from "./useChatFrame";

const VIEWPORT = { width: 1280, height: 800 };
const FRAME: Frame = { left: 400, top: 150, width: 500, height: 500 };

function setViewport() {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: VIEWPORT.width });
  Object.defineProperty(window, "innerHeight", { configurable: true, value: VIEWPORT.height });
}

function stubDesktop(desktop: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: desktop && query.includes("min-width: 641px"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
}

/** jsdom does no layout: the window is where we say it is. */
function stubRect(frame: Frame) {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
    left: frame.left, top: frame.top, width: frame.width, height: frame.height,
    right: frame.left + frame.width, bottom: frame.top + frame.height, x: frame.left, y: frame.top, toJSON() {},
  });
}

function Harness({ frame, onCommit, enabled = true }: { frame: Frame | null; onCommit: (f: Frame | null) => void; enabled?: boolean }) {
  const { panelRef, startMove, startResize, continueDragFrom, reset, toggle, onKeyDown, dragging, large, framed } = useChatFrame({ frame, onCommit, enabled });
  return (
    <section ref={panelRef} data-testid="panel" tabIndex={0} onKeyDown={(e) => onKeyDown(e)} data-dragging={dragging} data-large={large} data-framed-prop={framed}>
      <header data-testid="header" onPointerDown={startMove}>
        <button type="button">a button</button>
      </header>
      <span data-testid="handle-e" onPointerDown={startResize("e")} />
      <span data-testid="handle-nw" onPointerDown={startResize("nw")} />
      <button type="button" onClick={toggle}>toggle</button>
      <button type="button" onClick={reset}>reset</button>
      <button type="button" onClick={() => continueDragFrom({ left: 300, top: 150, width: 416, height: 560 }, { x: 500, y: 220 })}>detach</button>
    </section>
  );
}

const pointer = (type: string, target: Element | Window, x: number, y: number, init: MouseEventInit = {}) =>
  fireEvent(target, new MouseEvent(type, { bubbles: true, clientX: x, clientY: y, button: 0, ...init }));

beforeEach(() => {
  setViewport();
  stubDesktop(true);
  stubRect(FRAME);
});
afterEach(() => vi.restoreAllMocks());

describe("useChatFrame · painting", () => {
  it("writes the stored frame to the window as CSS variables, and marks it as framed", () => {
    render(<Harness frame={FRAME} onCommit={vi.fn()} />);
    const panel = screen.getByTestId("panel");
    expect(panel.dataset.framed).toBe("true");
    expect(panel.style.getPropertyValue("--chat-left")).toBe("400px");
    expect(panel.style.getPropertyValue("--chat-top")).toBe("150px");
    expect(panel.style.getPropertyValue("--chat-width")).toBe("500px");
    expect(panel.style.getPropertyValue("--chat-height")).toBe("500px");
  });

  it("paints nothing without a frame: the stylesheet places the window", () => {
    render(<Harness frame={null} onCommit={vi.fn()} />);
    const panel = screen.getByTestId("panel");
    expect(panel.dataset.framed).toBeUndefined();
    expect(panel.style.getPropertyValue("--chat-left")).toBe("");
  });

  it("paints nothing on a phone: it has the whole screen", () => {
    stubDesktop(false);
    render(<Harness frame={FRAME} onCommit={vi.fn()} />);
    expect(screen.getByTestId("panel").dataset.framed).toBeUndefined();
  });

  it("brings back inside the screen a frame saved on a bigger one, and remembers the fitted one", () => {
    const onCommit = vi.fn();
    render(<Harness frame={{ left: 5000, top: -300, width: 900, height: 5000 }} onCommit={onCommit} />);

    const fitted = onCommit.mock.calls[0][0] as Frame;
    expect(fitted.left + fitted.width).toBeLessThanOrEqual(VIEWPORT.width - 8);
    expect(fitted.top).toBeGreaterThanOrEqual(72);
    expect(fitted.top + fitted.height).toBeLessThanOrEqual(VIEWPORT.height - 8);
  });

  it("does not remember anything when the frame already fits", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("fits again when the browser window is resized", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);

    Object.defineProperty(window, "innerWidth", { configurable: true, value: 600 });
    act(() => void window.dispatchEvent(new Event("resize")));

    const fitted = onCommit.mock.calls.at(-1)?.[0] as Frame;
    expect(fitted.left + fitted.width).toBeLessThanOrEqual(600 - 8);
  });
});

describe("useChatFrame · dragging", () => {
  it("follows the pointer while it moves, and remembers where it was dropped", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    const panel = screen.getByTestId("panel");

    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    expect(panel.dataset.dragging).toBe("true");
    pointer("pointermove", window, 200, 220);
    expect(panel.style.getPropertyValue("--chat-left")).toBe("100px"); // 400 - 300
    expect(panel.style.getPropertyValue("--chat-top")).toBe("210px"); // 150 + 60
    expect(onCommit).not.toHaveBeenCalled(); // nothing is stored until the drop
    pointer("pointerup", window, 200, 220);

    expect(onCommit).toHaveBeenCalledWith({ left: 100, top: 210, width: 500, height: 500 });
    expect(panel.dataset.dragging).toBe("false");
  });

  it("stops at the screen edges and under the header", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    pointer("pointermove", window, -4000, -4000);
    pointer("pointerup", window, -4000, -4000);
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ left: 8, top: 72 }));
  });

  it("a press on a button of the header is a click, not a drag", () => {
    render(<Harness frame={FRAME} onCommit={vi.fn()} />);
    pointer("pointerdown", screen.getByRole("button", { name: "a button" }), 500, 160);
    expect(screen.getByTestId("panel").dataset.dragging).toBe("false");
  });

  it("only the main button drags", () => {
    render(<Harness frame={FRAME} onCommit={vi.fn()} />);
    pointer("pointerdown", screen.getByTestId("header"), 500, 160, { button: 2 });
    expect(screen.getByTestId("panel").dataset.dragging).toBe("false");
  });

  it("a press that does not move remembers nothing", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    pointer("pointerup", window, 500, 160);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("does not drag on a phone", () => {
    stubDesktop(false);
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    pointer("pointermove", window, 100, 100);
    pointer("pointerup", window, 100, 100);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("stops listening when the window goes away in the middle of a drag", () => {
    const onCommit = vi.fn();
    const { unmount } = render(<Harness frame={FRAME} onCommit={onCommit} />);
    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    unmount();
    pointer("pointermove", window, 100, 100);
    pointer("pointerup", window, 100, 100);
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("useChatFrame · resizing", () => {
  it("a handle moves its own edge and leaves the opposite one where it is", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);

    pointer("pointerdown", screen.getByTestId("handle-e"), 900, 400);
    pointer("pointermove", window, 980, 400);
    pointer("pointerup", window, 980, 400);
    expect(onCommit).toHaveBeenLastCalledWith({ left: 400, top: 150, width: 580, height: 500 });

    pointer("pointerdown", screen.getByTestId("handle-nw"), 400, 150);
    pointer("pointermove", window, 350, 120);
    pointer("pointerup", window, 350, 120);
    expect(onCommit).toHaveBeenLastCalledWith({ left: 350, top: 120, width: 550, height: 530 });
  });

  it("never makes it smaller than a usable chat", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    pointer("pointerdown", screen.getByTestId("handle-e"), 900, 400);
    pointer("pointermove", window, -3000, 400);
    pointer("pointerup", window, -3000, 400);
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ width: 340 }));
  });
});

describe("useChatFrame · without a mouse", () => {
  it("Alt+arrows move it by 16px", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    const panel = screen.getByTestId("panel");

    fireEvent.keyDown(panel, { key: "ArrowLeft", altKey: true });
    expect(onCommit).toHaveBeenLastCalledWith({ ...FRAME, left: 384 });
    fireEvent.keyDown(panel, { key: "ArrowDown", altKey: true });
    expect(onCommit).toHaveBeenLastCalledWith({ ...FRAME, top: 166 });
  });

  it("Alt+Shift+arrows resize it from the bottom-right corner", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowRight", altKey: true, shiftKey: true });
    expect(onCommit).toHaveBeenLastCalledWith({ ...FRAME, width: 516 });
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowUp", altKey: true, shiftKey: true });
    expect(onCommit).toHaveBeenLastCalledWith({ ...FRAME, height: 484 });
  });

  it("leaves the arrows alone without Alt (they move the cursor in the text box), and other keys too", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    const panel = screen.getByTestId("panel");
    const plain = fireEvent.keyDown(panel, { key: "ArrowLeft" });
    fireEvent.keyDown(panel, { key: "a", altKey: true });

    expect(plain).toBe(true); // not prevented
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("claims the key it handles (so the page does not scroll)", () => {
    render(<Harness frame={FRAME} onCommit={vi.fn()} />);
    expect(fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft", altKey: true })).toBe(false);
  });

  it("does nothing on a phone", () => {
    stubDesktop(false);
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft", altKey: true });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe("useChatFrame · enlarge and reset", () => {
  it("enlarges a compact window toward the page, keeping its bottom-right corner", () => {
    const onCommit = vi.fn();
    render(<Harness frame={{ left: 800, top: 120, width: 416, height: 560 }} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));

    const [big] = onCommit.mock.lastCall as [Frame];
    expect(big.width).toBeGreaterThan(600);
    expect(big.left + big.width).toBe(800 + 416); // the right edge stays: it grows toward the page
    expect(big.height).toBeGreaterThan(560);
    expect(big.top).toBeGreaterThanOrEqual(72); // and never under the header
  });

  it("brings an enlarged window back to compact", () => {
    const onCommit = vi.fn();
    render(<Harness frame={{ left: 400, top: 100, width: 768, height: 600 }} onCommit={onCommit} />);
    expect(screen.getByTestId("panel").dataset.large).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "toggle" }));
    const [small] = onCommit.mock.lastCall as [Frame];
    expect(small.width).toBeLessThan(600);
  });

  it("reset forgets the frame", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} />);
    fireEvent.click(screen.getByRole("button", { name: "reset" }));
    expect(onCommit).toHaveBeenLastCalledWith(null);
  });
});

describe("useChatFrame · carrying on a drag that started elsewhere (pulled off the dock)", () => {
  it("drags the window it is given from where the pointer is, and remembers where it is dropped", () => {
    const onCommit = vi.fn();
    render(<Harness frame={null} onCommit={onCommit} />);
    const panel = screen.getByTestId("panel");

    fireEvent.click(screen.getByRole("button", { name: "detach" }));
    pointer("pointermove", window, 450, 260); // 50 left, 40 down of where the pointer was
    expect(panel.style.getPropertyValue("--chat-left")).toBe("250px");
    expect(panel.style.getPropertyValue("--chat-top")).toBe("190px");
    pointer("pointerup", window, 450, 260);

    expect(onCommit).toHaveBeenCalledWith({ left: 250, top: 190, width: 416, height: 560 });
  });

  it("works while the frame is off (docked): it is the way out of the dock", () => {
    const onCommit = vi.fn();
    render(<Harness frame={null} onCommit={onCommit} enabled={false} />);
    fireEvent.click(screen.getByRole("button", { name: "detach" }));
    pointer("pointermove", window, 400, 220);
    pointer("pointerup", window, 400, 220);
    expect(onCommit).toHaveBeenCalledWith(expect.objectContaining({ left: 200, top: 150 }));
  });
});

describe("useChatFrame · docked", () => {
  it("paints nothing and does not drag while it is off", () => {
    const onCommit = vi.fn();
    render(<Harness frame={FRAME} onCommit={onCommit} enabled={false} />);
    expect(screen.getByTestId("panel").dataset.framed).toBeUndefined();

    pointer("pointerdown", screen.getByTestId("header"), 500, 160);
    pointer("pointermove", window, 200, 220);
    pointer("pointerup", window, 200, 220);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft", altKey: true });
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("paints the stored frame again once it is back on", () => {
    const { rerender } = render(<Harness frame={FRAME} onCommit={vi.fn()} enabled={false} />);
    rerender(<Harness frame={FRAME} onCommit={vi.fn()} enabled />);
    expect(screen.getByTestId("panel").dataset.framed).toBe("true");
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useChatDockLayout } from "./useChatDockLayout";

function Harness({ docked, width, onWidth, onDetach = vi.fn() }: { docked: boolean; width: number; onWidth: (w: number) => void; onDetach?: (p: { x: number; y: number }) => void }) {
  const { startResize, startDetach, onKeyDown } = useChatDockLayout({ docked, width, onWidth });
  return (
    <section data-testid="panel" tabIndex={0} onKeyDown={(e) => onKeyDown(e)}>
      <header data-testid="header" onPointerDown={(e) => startDetach(e, onDetach)}>
        <button type="button">a button</button>
      </header>
      <span data-testid="handle" onPointerDown={startResize} />
    </section>
  );
}

const root = document.documentElement;
const pointer = (type: string, target: Element | Window, x: number, button = 0) =>
  fireEvent(target, new MouseEvent(type, { bubbles: true, clientX: x, clientY: 100, button }));

beforeEach(() => {
  Object.defineProperty(window, "innerWidth", { configurable: true, value: 1440 });
  root.dir = "ltr";
});
afterEach(() => {
  delete root.dataset.chatDock;
  root.style.removeProperty("--chat-dock-width");
  root.dir = "";
});

describe("useChatDockLayout · pushing the page", () => {
  it("while docked, tells the page how much room to make", () => {
    render(<Harness docked width={450} onWidth={vi.fn()} />);
    expect(root.dataset.chatDock).toBe("");
    expect(root.style.getPropertyValue("--chat-dock-width")).toBe("450px");
  });

  it("changes nothing while floating", () => {
    render(<Harness docked={false} width={450} onWidth={vi.fn()} />);
    expect(root.dataset.chatDock).toBeUndefined();
    expect(root.style.getPropertyValue("--chat-dock-width")).toBe("");
  });

  it("gives the room back when the panel goes away, or is undocked", () => {
    const { rerender, unmount } = render(<Harness docked width={450} onWidth={vi.fn()} />);
    rerender(<Harness docked={false} width={450} onWidth={vi.fn()} />);
    expect(root.dataset.chatDock).toBeUndefined();

    rerender(<Harness docked width={450} onWidth={vi.fn()} />);
    unmount();
    expect(root.dataset.chatDock).toBeUndefined();
    expect(root.style.getPropertyValue("--chat-dock-width")).toBe("");
  });

  it("never asks for more than half of a screen that got narrower", () => {
    render(<Harness docked width={700} onWidth={vi.fn()} />);
    Object.defineProperty(window, "innerWidth", { configurable: true, value: 1000 });
    fireEvent(window, new Event("resize"));
    expect(root.style.getPropertyValue("--chat-dock-width")).toBe("500px");
  });
});

describe("useChatDockLayout · dragging the inner edge", () => {
  it("follows the pointer live, and remembers the width on release", () => {
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);

    pointer("pointerdown", screen.getByTestId("handle"), 1020);
    pointer("pointermove", window, 900);
    expect(root.style.getPropertyValue("--chat-dock-width")).toBe("540px"); // 1440 - 900
    expect(onWidth).not.toHaveBeenCalled();
    pointer("pointerup", window, 900);

    expect(onWidth).toHaveBeenCalledWith(540);
  });

  it("measures from the left edge when the page is right-to-left", () => {
    root.dir = "rtl";
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 420);
    pointer("pointermove", window, 520);
    pointer("pointerup", window, 520);
    expect(onWidth).toHaveBeenCalledWith(520);
  });

  it("stops at the limits", () => {
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 1020);
    pointer("pointermove", window, 5);
    pointer("pointerup", window, 5);
    expect(onWidth).toHaveBeenCalledWith(720);
  });

  it("a press that does not move remembers nothing", () => {
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 1020);
    pointer("pointerup", window, 1020);
    expect(onWidth).not.toHaveBeenCalled();
  });

  it("only the main button drags, and nothing drags while floating", () => {
    const onWidth = vi.fn();
    const { rerender } = render(<Harness docked width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 1020, 2);
    pointer("pointermove", window, 900);
    pointer("pointerup", window, 900);

    rerender(<Harness docked={false} width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 1020);
    pointer("pointermove", window, 900);
    pointer("pointerup", window, 900);
    expect(onWidth).not.toHaveBeenCalled();
  });

  it("stops listening when the panel goes away in the middle of a drag", () => {
    const onWidth = vi.fn();
    const { unmount } = render(<Harness docked width={420} onWidth={onWidth} />);
    pointer("pointerdown", screen.getByTestId("handle"), 1020);
    unmount();
    pointer("pointermove", window, 900);
    pointer("pointerup", window, 900);
    expect(onWidth).not.toHaveBeenCalled();
  });
});

describe("useChatDockLayout · without a mouse", () => {
  it("Alt+Left widens a panel at the right (the edge moves toward the page), Alt+Right narrows it", () => {
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft", altKey: true });
    expect(onWidth).toHaveBeenLastCalledWith(436);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowRight", altKey: true });
    expect(onWidth).toHaveBeenLastCalledWith(404);
  });

  it("is the other way round in right-to-left, where the panel is at the left", () => {
    root.dir = "rtl";
    const onWidth = vi.fn();
    render(<Harness docked width={420} onWidth={onWidth} />);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowRight", altKey: true });
    expect(onWidth).toHaveBeenLastCalledWith(436);
  });

  it("leaves the arrows alone without Alt (the cursor of the text box), and while floating", () => {
    const onWidth = vi.fn();
    const { rerender } = render(<Harness docked width={420} onWidth={onWidth} />);
    expect(fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft" })).toBe(true); // not prevented

    rerender(<Harness docked={false} width={420} onWidth={onWidth} />);
    fireEvent.keyDown(screen.getByTestId("panel"), { key: "ArrowLeft", altKey: true });
    expect(onWidth).not.toHaveBeenCalled();
  });
});

describe("useChatDockLayout · pulling the panel off the side", () => {
  it("a header pulled far enough lets go of the side, and hands over where the pointer is", () => {
    const onDetach = vi.fn();
    render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);

    pointer("pointerdown", screen.getByTestId("header"), 1100);
    pointer("pointermove", window, 1104); // a few pixels: still a click
    expect(onDetach).not.toHaveBeenCalled();
    pointer("pointermove", window, 1000);

    expect(onDetach).toHaveBeenCalledTimes(1);
    expect(onDetach).toHaveBeenCalledWith({ x: 1000, y: 100 });
  });

  it("hands over once, then stops watching", () => {
    const onDetach = vi.fn();
    render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByTestId("header"), 1100);
    pointer("pointermove", window, 1000);
    pointer("pointermove", window, 900);
    expect(onDetach).toHaveBeenCalledTimes(1);
  });

  it("a press that is released without travelling is a click: nothing comes off", () => {
    const onDetach = vi.fn();
    render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByTestId("header"), 1100);
    pointer("pointerup", window, 1100);
    pointer("pointermove", window, 800);
    expect(onDetach).not.toHaveBeenCalled();
  });

  it("a press on a button of the header is a click on the button", () => {
    const onDetach = vi.fn();
    render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByRole("button", { name: "a button" }), 1100);
    pointer("pointermove", window, 800);
    expect(onDetach).not.toHaveBeenCalled();
  });

  it("only the main button, and only while docked", () => {
    const onDetach = vi.fn();
    const { rerender } = render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByTestId("header"), 1100, 2);
    pointer("pointermove", window, 800);
    rerender(<Harness docked={false} width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByTestId("header"), 1100);
    pointer("pointermove", window, 800);
    expect(onDetach).not.toHaveBeenCalled();
  });

  it("stops watching when the panel goes away", () => {
    const onDetach = vi.fn();
    const { unmount } = render(<Harness docked width={420} onWidth={vi.fn()} onDetach={onDetach} />);
    pointer("pointerdown", screen.getByTestId("header"), 1100);
    unmount();
    pointer("pointermove", window, 800);
    expect(onDetach).not.toHaveBeenCalled();
  });
});

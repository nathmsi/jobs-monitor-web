import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { useChatWindow } from "./useChatWindow";

afterEach(() => {
  vi.restoreAllMocks();
  document.body.innerHTML = "";
});

/** A page with the chat's launcher and window (marked `data-chat-root`), and something else. */
function Page() {
  const { open, toggle, close, stepAside, launcherRef } = useChatWindow();
  return (
    <div>
      <button ref={launcherRef} data-chat-root="" onClick={toggle}>
        launcher
      </button>
      <button onClick={stepAside}>step aside</button>
      <button onClick={close}>close</button>
      {open && (
        <section data-chat-root="">
          <button>inside</button>
        </section>
      )}
      <p>the page</p>
    </div>
  );
}

function matchMedia(small: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: small && query.includes("max-width: 640px"), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }));
}

describe("useChatWindow", () => {
  it("starts closed, and the launcher toggles it", () => {
    const { result } = renderHook(() => useChatWindow());
    expect(result.current.open).toBe(false);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(true);
    act(() => result.current.toggle());
    expect(result.current.open).toBe(false);
  });

  it("a press on the page closes it, without taking the focus", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("launcher"));
    expect(screen.getByText("inside")).toBeInTheDocument();

    screen.getByText("step aside").focus();
    fireEvent.pointerDown(screen.getByText("the page"));

    expect(screen.queryByText("inside")).not.toBeInTheDocument();
    expect(screen.getByText("step aside")).toHaveFocus();
  });

  it("a press on the window or on the launcher is not outside", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("launcher"));

    fireEvent.pointerDown(screen.getByText("inside"));
    fireEvent.pointerDown(screen.getByText("launcher"));

    expect(screen.getByText("inside")).toBeInTheDocument();
  });

  it("closing from inside gives the focus back to the launcher", () => {
    render(<Page />);
    fireEvent.click(screen.getByText("launcher"));
    fireEvent.click(screen.getByText("close"));

    expect(screen.queryByText("inside")).not.toBeInTheDocument();
    expect(screen.getByText("launcher")).toHaveFocus();
  });

  it("does not listen to the page while it is closed", () => {
    const add = vi.spyOn(document, "addEventListener");
    render(<Page />);
    expect(add.mock.calls.filter(([type]) => type === "pointerdown")).toHaveLength(0);

    fireEvent.click(screen.getByText("launcher"));
    expect(add.mock.calls.filter(([type]) => type === "pointerdown")).toHaveLength(1);
  });

  it("stops listening once it is closed, and when the page is left", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = render(<Page />);
    fireEvent.click(screen.getByText("launcher"));
    fireEvent.click(screen.getByText("launcher"));
    expect(remove.mock.calls.filter(([type]) => type === "pointerdown")).toHaveLength(1);

    fireEvent.click(screen.getByText("launcher"));
    unmount();
    expect(remove.mock.calls.filter(([type]) => type === "pointerdown")).toHaveLength(2);
  });

  it("steps aside on a phone only: the window covers the page there, not on a desktop", () => {
    matchMedia(true);
    const phone = renderHook(() => useChatWindow());
    act(() => phone.result.current.toggle());
    act(() => phone.result.current.stepAside());
    expect(phone.result.current.open).toBe(false);

    matchMedia(false);
    const desktop = renderHook(() => useChatWindow());
    act(() => desktop.result.current.toggle());
    act(() => desktop.result.current.stepAside());
    expect(desktop.result.current.open).toBe(true);
  });
});

import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MatchedOffer } from "../api/client";
import * as stream from "../api/stream";
import { useMatchRun } from "./useMatchRun";

const offer: MatchedOffer = { id: "a__1", title: "Backend", company: "Acme", url: null, score: 88, reasons: ["r"], weak_points: ["w"] };

type Callbacks = Parameters<typeof stream.consumeMatchStream>[2];

/** A stream the test drives by hand: call `emit` for events, `finish` for the final results. */
function controlledStream() {
  let callbacks: Callbacks = {};
  let finish: (r: MatchedOffer[] | null) => void = () => {};
  let fail: (e: unknown) => void = () => {};
  const spy = vi.spyOn(stream, "consumeMatchStream").mockImplementation((_cv, _f, cb) => {
    callbacks = cb;
    return new Promise((resolve, reject) => {
      finish = resolve;
      fail = reject;
    });
  });
  return { spy, cb: () => callbacks, finish: (r: MatchedOffer[] | null) => finish(r), fail: (e: unknown) => fail(e) };
}

afterEach(() => vi.restoreAllMocks());

describe("useMatchRun", () => {
  it("starts idle", () => {
    const { result } = renderHook(() => useMatchRun("my cv"));
    expect(result.current).toMatchObject({ status: "idle", steps: [], results: [], error: null, busy: false, hasRun: false });
  });

  it("runs with the trimmed CV, the filters and an abort signal", async () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("  my cv  "));

    act(() => void result.current.run({ region: "center", kind: "company" }));

    expect(s.spy).toHaveBeenCalledWith("my cv", { region: "center", kind: "company" }, expect.any(Object), expect.any(AbortSignal));
    expect(result.current).toMatchObject({ status: "running", busy: true, hasRun: true });
  });

  it("tracks each search of the agent, pairing results by call id", () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());

    act(() => {
      s.cb().onToolCall?.("search_offers", { role: "A" }, "t0:1");
      s.cb().onToolCall?.("search_offers", { role: "B" }, "t0:2");
    });
    expect(result.current.steps.map((x) => [x.id, x.status])).toEqual([["t0:1", "running"], ["t0:2", "running"]]);

    act(() => s.cb().onToolResult?.("search_offers", 2800, true, "t0:2"));
    expect(result.current.steps.map((x) => x.status)).toEqual(["running", "done"]);
    expect(result.current.steps[1].duration).toBe(2800);

    act(() => s.cb().onToolResult?.("search_offers", 100, false, "t0:1"));
    expect(result.current.steps.map((x) => x.status)).toEqual(["failed", "done"]);
  });

  it("falls back to the tool name when the server sends no call id", () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());

    act(() => s.cb().onToolCall?.("read_offer", {}));
    act(() => s.cb().onToolResult?.("read_offer", 50, true));
    expect(result.current.steps[0]).toMatchObject({ id: "read_offer", status: "done", duration: 50 });
  });

  it("ignores a result that matches no running step", () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    act(() => s.cb().onToolResult?.("ghost", 1, true, "nope"));
    expect(result.current.steps).toEqual([]);
  });

  it("ends with the results", async () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());

    await act(async () => s.finish([offer]));
    expect(result.current).toMatchObject({ status: "done", busy: false, results: [offer] });
  });

  it("treats a stream with no final event as an empty result", async () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    await act(async () => s.finish(null));
    expect(result.current).toMatchObject({ status: "done", results: [] });
  });

  it("reports a failure", async () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    await act(async () => s.fail(new Error("Stream error")));
    expect(result.current).toMatchObject({ status: "error", error: "Stream error", busy: false });
  });

  it("clears the previous run when it starts again", async () => {
    const s = controlledStream();
    const { result } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    act(() => s.cb().onToolCall?.("search_offers", {}, "1"));
    await act(async () => s.finish([offer]));

    act(() => void result.current.run());
    expect(result.current).toMatchObject({ status: "running", steps: [], results: [], error: null });
  });

  it("cancels the running request when a new run starts, and ignores its late answer", async () => {
    const signals: AbortSignal[] = [];
    const resolvers: ((r: MatchedOffer[] | null) => void)[] = [];
    vi.spyOn(stream, "consumeMatchStream").mockImplementation((_c, _f, _cb, signal) => {
      signals.push(signal as AbortSignal);
      return new Promise((resolve) => resolvers.push(resolve));
    });
    const { result } = renderHook(() => useMatchRun("cv"));

    act(() => void result.current.run());
    act(() => void result.current.run());
    expect(signals[0].aborted).toBe(true);
    expect(signals[1].aborted).toBe(false);

    await act(async () => resolvers[0]([{ ...offer, id: "stale" }]));
    expect(result.current.results).toEqual([]); // the aborted run does not overwrite the new one
    await act(async () => resolvers[1]([offer]));
    await waitFor(() => expect(result.current.results).toEqual([offer]));
  });

  it("cancels the request when the component unmounts", () => {
    let signal: AbortSignal | undefined;
    vi.spyOn(stream, "consumeMatchStream").mockImplementation((_c, _f, _cb, s) => {
      signal = s;
      return new Promise(() => {});
    });
    const { result, unmount } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    unmount();
    expect(signal?.aborted).toBe(true);
  });

  it("does not report an error from a cancelled run", async () => {
    let reject: (e: unknown) => void = () => {};
    vi.spyOn(stream, "consumeMatchStream").mockImplementation(() => new Promise((_r, rej) => { reject = rej; }));
    const { result, unmount } = renderHook(() => useMatchRun("cv"));
    act(() => void result.current.run());
    unmount();
    await expect(Promise.resolve().then(() => reject(new Error("aborted")))).resolves.toBeUndefined();
    expect(result.current.status).toBe("running"); // frozen: nothing was dispatched after unmount
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import { consumeMatchStream, streamMatch, type ToolEvent } from "./stream";

/** A fetch Response whose body streams the given chunks. */
function streamingResponse(chunks: string[], init: { ok?: boolean; status?: number; json?: unknown } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return {
    ok: init.ok ?? true,
    status: init.status ?? 200,
    body,
    json: async () => init.json,
  } as unknown as Response;
}

const line = (e: ToolEvent) => JSON.stringify(e) + "\n";

async function collect(gen: AsyncGenerator<ToolEvent>): Promise<ToolEvent[]> {
  const out: ToolEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamMatch", () => {
  it("posts the CV and filters, with the abort signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const ctrl = new AbortController();

    await collect(streamMatch("my cv", { region: "tlv", kind: "agency" }, ctrl.signal));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("/api/match/stream");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ cvText: "my cv", region: "tlv", kind: "agency" });
    expect(init.signal).toBe(ctrl.signal);
  });

  it("parses JSON lines split across chunks and ignores malformed ones", async () => {
    const a = line({ type: "tool_call", name: "search" });
    const b = line({ type: "final", results: { results: [] } });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamingResponse([a.slice(0, 10), a.slice(10) + "not json\n", b.slice(0, 5), b.slice(5)]),
      ),
    );

    const events = await collect(streamMatch("cv"));
    expect(events.map((e) => e.type)).toEqual(["tool_call", "final"]);
  });

  it("parses a last line that has no trailing newline", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamingResponse([JSON.stringify({ type: "final" })])),
    );
    expect((await collect(streamMatch("cv"))).map((e) => e.type)).toEqual(["final"]);
  });

  it("throws the server message on an HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamingResponse([], { ok: false, status: 429, json: { message: "Rate limited" } })),
    );
    await expect(collect(streamMatch("cv"))).rejects.toThrow("Rate limited");
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    const resp = streamingResponse([], { ok: false, status: 500 });
    (resp as unknown as { json: () => Promise<never> }).json = () => Promise.reject(new Error("no json"));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(resp));
    await expect(collect(streamMatch("cv"))).rejects.toThrow("HTTP 500");
  });
});

describe("consumeMatchStream", () => {
  it("dispatches callbacks and returns the final results", async () => {
    const offer = { id: "1", title: "Dev", company: "Melio", url: null, score: 90, reasons: [], weak_points: [] };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamingResponse([
          line({ type: "tool_call", name: "search", input: { q: 1 } }),
          line({ type: "tool_result", name: "search", duration: 12, ok: true, cached: true, retryCount: 2 }),
          line({ type: "final", results: { results: [offer] } }),
        ]),
      ),
    );
    const cb = {
      onToolCall: vi.fn(),
      onToolResult: vi.fn(),
      onToolCached: vi.fn(),
      onRetry: vi.fn(),
      onFinal: vi.fn(),
    };

    const results = await consumeMatchStream("cv", {}, cb);

    expect(results).toEqual([offer]);
    expect(cb.onToolCall).toHaveBeenCalledWith("search", { q: 1 });
    expect(cb.onToolResult).toHaveBeenCalledWith("search", 12, true);
    expect(cb.onToolCached).toHaveBeenCalledWith("search");
    expect(cb.onRetry).toHaveBeenCalledWith("search", 2);
    expect(cb.onFinal).toHaveBeenCalledTimes(1);
  });

  it("returns null when the stream ends without a final event", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([line({ type: "tool_call", name: "x" })])));
    await expect(consumeMatchStream("cv", {}, {})).resolves.toBeNull();
  });

  it("rejects on an error event", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(streamingResponse([line({ type: "error", message: "agent exploded" })])),
    );
    await expect(consumeMatchStream("cv", {}, {})).rejects.toThrow("agent exploded");
  });
});

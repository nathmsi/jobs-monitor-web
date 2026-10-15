import { afterEach, describe, expect, it, vi } from "vitest";

import { makeJob } from "../test/factories";
import { streamChat, toChatOffer, type ChatEvent } from "./chat";

function streamingResponse(chunks: string[], init: { ok?: boolean; status?: number; json?: unknown } = {}) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return { ok: init.ok ?? true, status: init.status ?? 200, body, json: async () => init.json } as unknown as Response;
}

async function collect(gen: AsyncGenerator<ChatEvent>): Promise<ChatEvent[]> {
  const out: ChatEvent[] = [];
  for await (const e of gen) out.push(e);
  return out;
}

afterEach(() => vi.unstubAllGlobals());

describe("streamChat", () => {
  it("posts the conversation and the language, with the abort signal", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const ctrl = new AbortController();

    await collect(streamChat([{ role: "user", content: "hi" }], "fr", ctrl.signal));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/chat\/stream$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ messages: [{ role: "user", content: "hi" }], locale: "fr" });
    expect(init.signal).toBe(ctrl.signal);
  });

  it("yields the events in order", async () => {
    const final: ChatEvent = { type: "final", reply: { text: "ok", offers: [], links: [], suggestions: [] } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamingResponse([
          JSON.stringify({ type: "tool_call", callId: "a", name: "search_offers" }) + "\n",
          JSON.stringify(final) + "\n",
        ]),
      ),
    );

    const events = await collect(streamChat([{ role: "user", content: "x" }], "en"));
    expect(events.map((e) => e.type)).toEqual(["tool_call", "final"]);
  });

  it("throws the API's message on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([], { ok: false, status: 429, json: { message: "slow down" } })));
    await expect(collect(streamChat([{ role: "user", content: "x" }], "en"))).rejects.toThrow("slow down");
  });

  it("falls back to the status when the error has no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([], { ok: false, status: 503 })));
    await expect(collect(streamChat([{ role: "user", content: "x" }], "en"))).rejects.toThrow("HTTP 503");
  });
});

describe("toChatOffer", () => {
  it("keeps what a card needs and drops the long description", () => {
    const job = makeJob({ external_id: "1", title: "Dev", description: "x".repeat(5000), url: "https://x" });
    const offer = toChatOffer(job);
    expect(offer).toMatchObject({ source: "melio", external_id: "1", title: "Dev" });
    expect(offer).not.toHaveProperty("description");
    expect(offer).not.toHaveProperty("url");
  });
});

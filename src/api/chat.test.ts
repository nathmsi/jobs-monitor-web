import { afterEach, describe, expect, it, vi } from "vitest";

import { makeJob } from "../../tests/support/factories";
import { normalizeReply, streamChat, type ChatEvent } from "./chat";

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

    await collect(streamChat({ messages: [{ role: "user", content: "hi" }], locale: "fr", signal: ctrl.signal }));

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/api\/chat\/stream$/);
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual({ messages: [{ role: "user", content: "hi" }], locale: "fr" });
    expect(init.signal).toBe(ctrl.signal);
  });

  it("sends the profile and CVs only when the user shared them", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal("fetch", fetchMock);
    const profile = { skills: ["Node.js"], roles: [], languages: [], locations: [], titles: [], seniority: null, years: null };
    const cvs = [{ id: "cv1", name: "CV.pdf", text: "Senior engineer" }];

    await collect(streamChat({ messages: [{ role: "user", content: "hi" }], locale: "en", shared: { profile, cvs } }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).toMatchObject({ profile, cvs });

    await collect(streamChat({ messages: [{ role: "user", content: "hi" }], locale: "en", shared: { profile: null, cvs: [] } }));
    const body = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(body).not.toHaveProperty("profile");
    expect(body).not.toHaveProperty("cvs");
  });

  it("yields the events in order", async () => {
    const final = { type: "final", reply: { text: "ok", blocks: [] } };
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        streamingResponse([
          JSON.stringify({ type: "tool_call", callId: "a", name: "search_offers" }) + "\n",
          JSON.stringify(final) + "\n",
        ]),
      ),
    );

    const events = await collect(streamChat({ messages: [{ role: "user", content: "x" }], locale: "en" }));
    expect(events.map((e) => e.type)).toEqual(["tool_call", "final"]);
  });

  it("throws the API's message on an HTTP error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([], { ok: false, status: 429, json: { message: "slow down" } })));
    await expect(collect(streamChat({ messages: [{ role: "user", content: "x" }], locale: "en" }))).rejects.toThrow("slow down");
  });

  it("falls back to the status when the error has no body", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([], { ok: false, status: 503 })));
    await expect(collect(streamChat({ messages: [{ role: "user", content: "x" }], locale: "en" }))).rejects.toThrow("HTTP 503");
  });

  it("sends the page the user is on, and nothing when there is none", async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamingResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await collect(streamChat({ messages: [{ role: "user", content: "hi" }], locale: "en", page: { kind: "offer", source: "melio", externalId: "42" } }));
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).page).toEqual({ kind: "offer", source: "melio", externalId: "42" });

    await collect(streamChat({ messages: [{ role: "user", content: "hi" }], locale: "en" }));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body)).not.toHaveProperty("page");
  });

  it("hands over the reply as typed blocks, not as the raw JSON", async () => {
    const job = makeJob({ external_id: "1", title: "Dev", description: "x".repeat(5000) });
    const final = {
      type: "final",
      reply: { text: "Two things.", blocks: [{ type: "offers", offers: [job] }, { type: "links", links: [{ path: "/coach", label: "CV" }] }, { type: "suggestions", replies: ["More"] }] },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(streamingResponse([JSON.stringify(final) + "\n"])));

    const [event] = await collect(streamChat({ messages: [{ role: "user", content: "x" }], locale: "en" }));
    expect(event.type === "final" && event.reply.blocks.map((b) => b.type)).toEqual(["offers", "links", "suggestions"]);
    expect(JSON.stringify(event)).not.toContain("xxxxx"); // the long description was dropped
  });
});

describe("normalizeReply", () => {
  it("reads text and blocks", () => {
    expect(normalizeReply({ text: "Hi", blocks: [{ type: "suggestions", replies: ["A"] }] })).toEqual({
      text: "Hi",
      blocks: [{ type: "suggestions", buttons: [{ label: "A", action: { type: "send", text: "A" } }] }],
    });
  });

  it("skips a block kind this version does not know, and a block that is broken: the rest is still shown", () => {
    const reply = normalizeReply({
      text: "Hi",
      blocks: [{ type: "hologram", x: 1 }, { type: "offers", offers: "nope" }, null, 42, { type: "links", links: [{ path: "/jobs", label: "Offers" }] }],
    });
    expect(reply.blocks.map((b) => b.type)).toEqual(["links"]);
  });

  it("still understands the API from before blocks (offers, links, suggestions as fields)", () => {
    const job = makeJob({ external_id: "1", title: "Dev" });
    const reply = normalizeReply({ text: "Old API", offers: [job], links: [{ path: "/coach", label: "CV" }], suggestions: ["More"] });
    expect(reply.blocks.map((b) => b.type)).toEqual(["offers", "links", "suggestions"]);
  });

  it("survives anything that is not a reply", () => {
    for (const raw of [null, undefined, 42, "x", [], {}]) expect(normalizeReply(raw)).toEqual({ text: "", blocks: [] });
  });
});

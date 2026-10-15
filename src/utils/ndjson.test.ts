import { describe, expect, it } from "vitest";

import { readNdjson } from "./ndjson";

function body(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

async function collect<T>(gen: AsyncGenerator<T>): Promise<T[]> {
  const out: T[] = [];
  for await (const v of gen) out.push(v);
  return out;
}

describe("readNdjson", () => {
  it("yields one value per line", async () => {
    expect(await collect(readNdjson(body(['{"a":1}\n{"a":2}\n'])))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("joins a line cut between two chunks", async () => {
    expect(await collect(readNdjson(body(['{"a":', '1}\n{"a"', ":2}\n"])))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("reads a last line that has no newline", async () => {
    expect(await collect(readNdjson(body(['{"a":1}\n{"a":2}'])))).toEqual([{ a: 1 }, { a: 2 }]);
  });

  it("skips blank and malformed lines", async () => {
    expect(await collect(readNdjson(body(['\n{"a":1}\nnot json\n\n{"a":2}\n'])))).toEqual([{ a: 1 }, { a: 2 }]);
  });
});

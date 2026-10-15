/**
 * Reads a body of JSON Lines (one JSON value per line) as it arrives. A line that
 * is not valid JSON is skipped, so one bad line never ends the stream.
 */
export async function* readNdjson<T>(body: ReadableStream<Uint8Array>): AsyncGenerator<T> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const parse = (line: string): T | undefined => {
    if (!line.trim()) return undefined;
    try {
      return JSON.parse(line) as T;
    } catch {
      return undefined;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const parsed = parse(line);
        if (parsed !== undefined) yield parsed;
      }
    }
    const last = parse(buffer + decoder.decode());
    if (last !== undefined) yield last;
  } finally {
    reader.releaseLock();
  }
}

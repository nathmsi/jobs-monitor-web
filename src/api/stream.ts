export interface ToolEvent {
  type: "tool_call" | "tool_result" | "final";
  name?: string;
  input?: unknown;
  ok?: boolean;
  duration?: number;
  cached?: boolean;
  retryCount?: number;
}

const API = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(/\/+$/, "");

/** Stream agent events in real-time (JSON Lines format).
 *  Each line is a JSON event.
 */
export async function* streamMatch(
  cvText: string,
  filters: { region?: string; kind?: string; remote?: boolean } = {}
): AsyncGenerator<ToolEvent> {
  const resp = await fetch(`${API}/api/match/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText, ...filters }),
  });

  if (!resp.ok) {
    const detail = await resp.json().catch(() => null);
    throw new Error(detail?.message || `HTTP ${resp.status}`);
  }

  const reader = resp.body?.getReader();
  if (!reader) throw new Error("No response body");

  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            yield json as ToolEvent;
          } catch (e) {
            // Ignore parse errors
          }
        }
      }
    }

    // Process remaining buffer
    buffer += decoder.decode();
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        yield json as ToolEvent;
      } catch (e) {
        // Ignore
      }
    }
  } finally {
    reader.releaseLock();
  }
}

/** Consume event stream and call callbacks. */
export async function consumeMatchStream(
  cvText: string,
  filters: { region?: string; kind?: string; remote?: boolean },
  callbacks: {
    onToolCall?: (name: string, input: unknown) => void;
    onToolResult?: (name: string, duration: number, ok: boolean) => void;
    onToolCached?: (name: string) => void;
    onRetry?: (name: string, count: number) => void;
    onFinal?: () => void;
  }
): Promise<void> {
  for await (const event of streamMatch(cvText, filters)) {
    if (event.type === "tool_call") {
      callbacks.onToolCall?.(event.name || "", event.input);
    } else if (event.type === "tool_result") {
      callbacks.onToolResult?.(event.name || "", event.duration || 0, event.ok ?? false);
      if (event.cached) {
        callbacks.onToolCached?.(event.name || "");
      }
      if ((event.retryCount ?? 0) > 0) {
        callbacks.onRetry?.(event.name || "", event.retryCount || 0);
      }
    } else if (event.type === "final") {
      callbacks.onFinal?.();
    }
  }
}

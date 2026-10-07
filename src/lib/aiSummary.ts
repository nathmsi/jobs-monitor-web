export interface AiInfo {
  headline: string;
  stack: string[];
  level: string;
  remote: string;
  highlights: string[];
}

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

/** Parse the backend's `ai_summary` JSON. Returns null when it is missing or
 *  unusable; optional fields are normalised so consumers never crash on them. */
export function parseAiSummary(raw: string | null | undefined): AiInfo | null {
  if (!raw) return null;
  try {
    const p = JSON.parse(raw) as Record<string, unknown> | null;
    if (!p || typeof p !== "object") return null;
    if (typeof p.headline !== "string" || !p.headline || !Array.isArray(p.stack)) return null;
    return {
      headline: p.headline,
      stack: strings(p.stack),
      level: typeof p.level === "string" ? p.level : "",
      remote: typeof p.remote === "string" ? p.remote : "",
      highlights: strings(p.highlights),
    };
  } catch {
    return null;
  }
}

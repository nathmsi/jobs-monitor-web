/** Rewrite examples come as `Before: "…" → After: "…"`; anything else is not a rewrite. */
export function splitBeforeAfter(example: string): { before: string; after: string } | null {
  const m = example.match(/^\s*Before\s*:\s*(.+?)\s*(?:→|->)\s*After\s*:\s*(.+)$/is);
  if (!m) return null;
  const unquote = (s: string) => s.trim().replace(/^["'“«]+|["'”»]+$/g, "");
  return { before: unquote(m[1]), after: unquote(m[2]) };
}

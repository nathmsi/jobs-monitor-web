/** The public pages a server renders for search engines (mirrors the rewrites in vercel.json). */
export type SeoRoute =
  | { type: "job"; source: string; id: string }
  | { type: "company"; key: string }
  | { type: "topic"; tech: string; region: string }
  | { type: "sitemap" };

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

export function matchRoute(pathname: string): SeoRoute | null {
  const parts = pathname.split("/").filter(Boolean).map(decode);
  if (parts.length === 1 && parts[0] === "sitemap.xml") return { type: "sitemap" };
  if (parts[0] === "jobs" && (parts.length === 3 || parts.length === 4)) {
    return { type: "job", source: parts[1], id: parts[2] };
  }
  if (parts[0] === "companies" && parts.length === 2) return { type: "company", key: parts[1] };
  if (parts[0] === "tech" && (parts.length === 2 || parts.length === 3)) {
    return { type: "topic", tech: parts[1], region: parts[2] ?? "all" };
  }
  return null;
}

import { companyPath, jobPath, topicPath } from "../../src/utils/slug.js";
import { escapeHtml } from "./html.js";

/** What the backend's index lists (see `GET /api/seo/index`). */
export interface SeoIndex {
  jobs: { source: string; external_id: string; title: string; lastmod: string | null }[];
  companies: { key: string; label: string; count: number }[];
  topics: { tech: { slug: string }; region: string; count: number }[];
}

/** The protocol allows 50,000 URLs per sitemap. */
const MAX_URLS = 50_000;

export function buildSitemap(index: SeoIndex, siteUrl: string): string {
  const urls: { loc: string; lastmod?: string }[] = [
    { loc: `${siteUrl}/` },
    { loc: `${siteUrl}/jobs` },
    { loc: `${siteUrl}/coach` },
    ...index.topics.map((t) => ({ loc: `${siteUrl}${topicPath(t.tech.slug, t.region)}` })),
    ...index.companies.map((c) => ({ loc: `${siteUrl}${companyPath(c.key)}` })),
    ...index.jobs.map((j) => ({
      loc: `${siteUrl}${jobPath({ source: j.source, external_id: j.external_id, title: j.title })}`,
      lastmod: j.lastmod ? j.lastmod.slice(0, 10) : undefined,
    })),
  ].slice(0, MAX_URLS);

  const entries = urls
    .map((u) => `  <url><loc>${escapeHtml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ""}</url>`)
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

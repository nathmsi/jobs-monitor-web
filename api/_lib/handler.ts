import type { CompanyPageData, Job, SourceInfo, TopicPageData } from "../../src/types.js";
import { injectIntoShell } from "./html.js";
import { renderCompany, renderJob, renderNotFound, renderTopic, type Rendered } from "./pages.js";
import { matchRoute, type SeoRoute } from "./routes.js";
import { buildSitemap, type SeoIndex } from "./sitemap.js";

/** The small part of a request / response the handler needs (Node's, Vercel's and Vite's all fit). */
export interface Req {
  /** Path and query, as requested ("/jobs/melio/1/dev"). */
  url: string;
  query: Record<string, string | string[] | undefined>;
}
export interface Res {
  statusCode: number;
  setHeader(name: string, value: string): unknown;
  end(body: string): unknown;
}

export interface Deps {
  /** Base URL of jobs-monitor-api. */
  apiBase: string;
  /** Public address of the site, without a trailing slash. */
  siteUrl: string;
  /** The app's built index.html. */
  getShell: () => Promise<string>;
  fetchImpl?: typeof fetch;
}

class HttpError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`HTTP ${status}`);
    this.status = status;
  }
}

const PAGE_CACHE = "public, s-maxage=3600, stale-while-revalidate=86400";

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** The route, from the rewritten query (Vercel) or from the original path (dev server). */
function routeOf(req: Req): SeoRoute | null {
  const type = first(req.query.type);
  if (type === "job") return { type, source: first(req.query.source), id: first(req.query.id) };
  if (type === "company") return { type, key: first(req.query.key) };
  if (type === "topic") return { type, tech: first(req.query.tech), region: first(req.query.region) || "all" };
  if (type === "sitemap") return { type };
  return matchRoute(new URL(req.url, "http://local").pathname);
}

export function createHandler(deps: Deps) {
  const doFetch = deps.fetchImpl ?? fetch;
  const api = deps.apiBase.replace(/\/+$/, "");

  async function getJson<T>(path: string): Promise<T> {
    const resp = await doFetch(`${api}${path}`);
    if (!resp.ok) throw new HttpError(resp.status);
    return (await resp.json()) as T;
  }

  async function render(route: SeoRoute): Promise<Rendered> {
    switch (route.type) {
      case "job": {
        const job = await getJson<Job>(`/api/jobs/${encodeURIComponent(route.source)}/${encodeURIComponent(route.id)}`);
        const sources = await getJson<SourceInfo[]>("/api/sources").catch(() => [] as SourceInfo[]);
        return renderJob(job, sources.find((s) => s.key === job.source), deps.siteUrl);
      }
      case "company":
        return renderCompany(await getJson<CompanyPageData>(`/api/seo/company/${encodeURIComponent(route.key)}`), deps.siteUrl);
      case "topic": {
        const params = new URLSearchParams({ tech: route.tech, region: route.region });
        const [data, regions, sources] = await Promise.all([
          getJson<TopicPageData>(`/api/seo/topic?${params}`),
          getJson<{ key: string; label_en: string }[]>("/api/regions").catch(() => [] as { key: string; label_en: string }[]),
          getJson<SourceInfo[]>("/api/sources").catch(() => [] as SourceInfo[]),
        ]);
        const others = regions.filter((r) => r.key !== data.region.key).map((r) => ({ key: r.key, label: r.label_en }));
        return renderTopic(data, others, new Map(sources.map((s) => [s.key, s.label])), deps.siteUrl);
      }
      case "sitemap":
        throw new Error("handled separately");
    }
  }

  return async function handler(req: Req, res: Res): Promise<void> {
    const route = routeOf(req);
    const pathname = new URL(req.url, "http://local").pathname;

    try {
      if (route?.type === "sitemap") {
        const xml = buildSitemap(await getJson<SeoIndex>("/api/seo/index"), deps.siteUrl);
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/xml; charset=utf-8");
        res.setHeader("Cache-Control", PAGE_CACHE);
        res.end(xml);
        return;
      }

      const shell = await deps.getShell();
      if (!route) {
        res.statusCode = 404;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        const nf = renderNotFound(deps.siteUrl, pathname);
        res.end(injectIntoShell(shell, nf.meta, nf.body));
        return;
      }

      try {
        const rendered = await render(route);
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", PAGE_CACHE);
        res.end(injectIntoShell(shell, rendered.meta, rendered.body));
      } catch (error) {
        if (error instanceof HttpError && error.status === 404) {
          const nf = renderNotFound(deps.siteUrl, pathname);
          res.statusCode = 404;
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.setHeader("Cache-Control", "public, s-maxage=300");
          res.end(injectIntoShell(shell, nf.meta, nf.body));
          return;
        }
        // The API is down: serve the plain app so visitors still get the page.
        res.statusCode = 200;
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.setHeader("Cache-Control", "no-store");
        res.end(shell);
      }
    } catch {
      res.statusCode = 502;
      res.setHeader("Content-Type", "text/plain; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end("Service unavailable");
    }
  };
}

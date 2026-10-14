import type { CompanyPageData, Job, SourceInfo, TopicPageData } from "../../src/types.js";
import { parseAiSummary } from "../../src/utils/aiSummary.js";
import { descriptionBlocks } from "../../src/utils/descriptionBlocks.js";
import { isIndexableJob, offerText } from "../../src/utils/indexable.js";
import { companyPath, jobPath, topicPath } from "../../src/utils/slug.js";
import { escapeHtml, type PageMeta } from "./html.js";
import { jobPostingJsonLd } from "./jsonLd.js";

const BRAND = "Tech Jobs";
/** Listing pages with fewer offers are thin content: kept out of search results. */
const MIN_LISTING = 3;

export interface Rendered {
  meta: PageMeta;
  body: string;
}

const nav = `<header><a href="/">${BRAND}</a> <nav><a href="/jobs">Offers</a> <a href="/coach">CV Coach</a></nav></header>`;
const page = (inner: string) => `${nav}<main>${inner}</main>`;

function jobList(jobs: Job[], sources: Map<string, string>): string {
  return `<ul>${jobs
    .map(
      (j) =>
        `<li><a href="${escapeHtml(jobPath(j))}">${escapeHtml(j.title)}</a> · ${escapeHtml(sources.get(j.source) ?? j.source)}` +
        `${j.location ? ` · ${escapeHtml(j.location.split(",")[0])}` : ""}</li>`,
    )
    .join("")}</ul>`;
}

/** The description as headings and short paragraphs. */
function descriptionHtml(text: string): string {
  return descriptionBlocks(text)
    .map((b) => (b.type === "heading" ? `<h2>${escapeHtml(b.text)}</h2>` : `<p>${escapeHtml(b.text)}</p>`))
    .join("");
}

export function renderJob(job: Job, source: SourceInfo | undefined, siteUrl: string): Rendered {
  const company = source?.label ?? job.source;
  const path = jobPath(job);
  const canonical = `${siteUrl}${path}`;
  const ai = parseAiSummary(job.ai_summary);
  const text = offerText(job);
  const indexable = isIndexableJob(job);
  const jsonLd = jobPostingJsonLd(job, source, canonical);

  const meta: PageMeta = {
    title: `${job.title} · ${company} — ${BRAND}`,
    description: (ai?.headline || text.slice(0, 155) || `${job.title} at ${company}`).slice(0, 160),
    canonical,
    robots: indexable ? undefined : "noindex,follow",
    jsonLd: jsonLd ? [jsonLd] : undefined,
  };

  const skills = ai ? [ai.level, ai.remote, ...ai.stack].filter(Boolean) : [];
  const body = page(
    `<article>` +
      `<p>Posted by <a href="${escapeHtml(companyPath(job.source))}">${escapeHtml(company)}</a></p>` +
      `<h1>${escapeHtml(job.title)}</h1>` +
      `<p>${escapeHtml(job.location.split(",")[0] ?? "")}</p>` +
      (job.is_expired ? `<p>This offer is probably closed.</p>` : "") +
      (skills.length ? `<ul>${skills.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "") +
      descriptionHtml(text || ai?.headline || "") +
      (job.url ? `<p><a href="${escapeHtml(job.url)}" rel="nofollow noopener">Apply on the company site</a></p>` : "") +
      `</article>`,
  );
  return { meta, body };
}

export function renderCompany(data: CompanyPageData, siteUrl: string): Rendered {
  const name = data.source.label;
  const skills = data.top_skills.map((s) => s.skill);
  const meta: PageMeta = {
    title: `${name} jobs — ${BRAND}`,
    description: `${data.total} open offers at ${name}${skills.length ? ` · ${skills.slice(0, 4).join(", ")}` : ""}`,
    canonical: `${siteUrl}${companyPath(data.source.key)}`,
    robots: data.total === 0 ? "noindex,follow" : undefined,
  };
  const sources = new Map([[data.source.key, name]]);
  const body = page(
    `<h1>${escapeHtml(name)}</h1>` +
      `<p>${data.source.kind === "agency" ? "Staffing agency" : "Company"} · ${data.total} open offers</p>` +
      (skills.length ? `<h2>Most requested skills</h2><ul>${skills.map((s) => `<li>${escapeHtml(s)}</li>`).join("")}</ul>` : "") +
      jobList(data.jobs, sources),
  );
  return { meta, body };
}

export function renderTopic(
  data: TopicPageData,
  otherRegions: { key: string; label: string }[],
  sources: Map<string, string>,
  siteUrl: string,
): Rendered {
  const place = data.region.key === "all" ? "Israel" : data.region.label_en;
  const heading = `${data.tech.label} jobs in ${place}`;
  const meta: PageMeta = {
    title: `${heading} — ${BRAND}`,
    description: `${data.total} open ${data.tech.label} offers in ${place}, updated every day.`,
    canonical: `${siteUrl}${topicPath(data.tech.slug, data.region.key)}`,
    robots: data.total < MIN_LISTING ? "noindex,follow" : undefined,
  };
  const body = page(
    `<h1>${escapeHtml(heading)}</h1><p>${data.total} open offers</p>` +
      `<nav aria-label="Other regions">${otherRegions
        .map((r) => `<a href="${escapeHtml(topicPath(data.tech.slug, r.key))}">${escapeHtml(r.label)}</a>`)
        .join(" ")}</nav>` +
      jobList(data.jobs, sources),
  );
  return { meta, body };
}

export function renderNotFound(siteUrl: string, path: string): Rendered {
  return {
    meta: {
      title: `Page not found — ${BRAND}`,
      description: "This page does not exist.",
      canonical: `${siteUrl}${path}`,
      robots: "noindex,follow",
    },
    body: page(`<h1>Page not found</h1><p><a href="/jobs">Browse the latest offers</a></p>`),
  };
}

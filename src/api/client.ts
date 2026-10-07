import type { Job, RegionJobs, RegionInfo, SourceInfo } from "../types";

// The frontend talks to the jobs-monitor-api backend, which reads the offers
// from Supabase and returns only what we ask for (region + optional keyword).
// No static files, no direct DB access from the browser.
// Base URL is set via VITE_API_URL (Vercel env in prod); defaults to the local
// dev server. Trailing slashes are trimmed so `${API}/api/...` stays clean.
export const API = (import.meta.env.VITE_API_URL ?? "http://localhost:8080").replace(
  /\/+$/,
  "",
);

async function getJson<T>(path: string): Promise<T> {
  const resp = await fetch(`${API}${path}`, { cache: "no-store" });
  if (!resp.ok) throw new Error(`HTTP ${resp.status} — ${resp.statusText}`);
  return resp.json() as Promise<T>;
}

export function getSources(): Promise<SourceInfo[]> {
  return getJson<SourceInfo[]>(`/api/sources`);
}

export function getRegions(): Promise<RegionInfo[]> {
  return getJson<RegionInfo[]>(`/api/regions`);
}

export interface JobQuery {
  region: string;
  q?: string;
  role?: string;
  category?: string;
  kind?: string; // "company" | "agency"
  sort?: string; // "recent" | "oldest" | "hot"
  limit?: number; // <=0 → every match
  offset?: number;
}

export interface JobsPage {
  jobs: Job[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

function jobsQuery(query: JobQuery): string {
  const p = new URLSearchParams({ region: query.region });
  if (query.q) p.set("q", query.q);
  if (query.role) p.set("role", query.role);
  if (query.category) p.set("category", query.category);
  if (query.kind) p.set("kind", query.kind);
  if (query.sort) p.set("sort", query.sort);
  p.set("limit", String(query.limit ?? 30));
  p.set("offset", String(query.offset ?? 0));
  return p.toString();
}

/** One page of offers matching the filters (server-side filter + pagination). */
export function getJobsPage(query: JobQuery): Promise<JobsPage> {
  return getJson<JobsPage>(`/api/jobs?${jobsQuery(query)}`);
}

export interface CvAnalysis {
  snapshot: {
    headline: string;
    current_level: string;
    years_experience: number;
    domains: string[];
    languages: string[];
  };
  target: {
    roles: string[];
    seniority: string;
    years_to_target: string;
    readiness_pct: number;
    assumptions?: string;
  };
  strengths: { point: string; evidence: string }[];
  gaps: { gap: string; why_it_matters: string; severity: "high" | "low" | "medium" | string }[];
  cv_feedback: { issue: string; fix: string; example: string }[];
  skills_to_learn: { skill: string; reason: string; how: string }[];
  action_plan: {
    next_30_days: string[];
    next_90_days: string[];
    next_6_months: string[];
  };
  keywords_missing: string[];
  overall: { score: number; summary: string };
}

export interface MatchedOffer {
  id: string;
  title: string;
  company: string;
  url: string | null;
  score: number;
  reasons: string[];
  weak_points: string[];
}

/** Ask the matching agent for the best offers for a CV. */
export async function matchCv(
  cvText: string,
  filters: { region?: string; kind?: string; remote?: boolean } = {},
): Promise<MatchedOffer[]> {
  const resp = await fetch(`${API}/api/match`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText, ...filters }),
  });
  if (!resp.ok) {
    const detail = await resp.json().catch(() => null);
    throw new Error(detail?.message || `HTTP ${resp.status}`);
  }
  const data = (await resp.json()) as { results: MatchedOffer[] };
  return data.results;
}

/** Send a CV (+ optional goal) to the AI career-review endpoint. `lang` is the
 *  site language so the analysis comes back in the same language. */
export async function analyzeCvAi(
  cvText: string,
  goal: string,
  lang: string,
  signal?: AbortSignal,
): Promise<CvAnalysis> {
  const resp = await fetch(`${API}/api/cv/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ cvText, goal, lang }),
    signal,
  });
  if (!resp.ok) {
    const detail = await resp.json().catch(() => null);
    throw new Error(detail?.message || `HTTP ${resp.status}`);
  }
  return resp.json() as Promise<CvAnalysis>;
}

/** Every job for a region (limit=0) — used by the client-side "For me" ranking
 *  and the profile page, which need the full set. Rejects on failure so
 *  react-query surfaces the error instead of caching an empty result. */
export async function getRegionJobs(region: string): Promise<Job[]> {
  const data = await getJson<RegionJobs>(
    `/api/jobs?region=${encodeURIComponent(region)}&limit=0`,
  );
  return data.jobs;
}

// Keep letters/digits (Latin + Hebrew), drop spaces/hyphens/punctuation so
// "frontend", "front end" and "front-end" all match the same text.
function collapse(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9֐-׿]+/g, "");
}

/** Split a query into normalized tokens. */
export function queryTokens(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^a-z0-9֐-׿]+/i)
    .map(collapse)
    .filter(Boolean);
}

/** True if every query word appears in the given text. */
export function textMatches(text: string, tokens: string[]): boolean {
  if (tokens.length === 0) return true;
  const hay = collapse(text);
  return tokens.every((tok) => hay.includes(tok));
}

/** True if ANY of the given terms appears in the text (OR match). */
export function textMatchesAny(text: string, terms: string[]): boolean {
  if (terms.length === 0) return true;
  const hay = collapse(text);
  return terms.some((term) => {
    const t = collapse(term);
    return t.length > 0 && hay.includes(t);
  });
}

/** Keep jobs whose title/excerpt matches every word of the query. */
export function filterByKeyword(jobs: Job[], query: string): Job[] {
  const tokens = queryTokens(query);
  if (tokens.length === 0) return jobs;
  return jobs.filter((j) =>
    textMatches(`${j.title} ${j.excerpt} ${j.description ?? ""}`, tokens),
  );
}

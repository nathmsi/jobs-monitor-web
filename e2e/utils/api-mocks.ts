import type { Page } from '@playwright/test';

import { ROLES } from '../../src/constants/roles';
import { MOCK_JOBS, MOCK_REGIONS, MOCK_SOURCES, VOCAB, type MockJob, type MockSuggestion } from '../fixtures/data';

/**
 * Stateful stand-in for the jobs-monitor-api backend. It honours the query
 * parameters the frontend sends (q, kind, category, sort, limit, offset) so
 * specs assert on behaviour, not on canned responses.
 */
export interface ApiMock {
  /** Every request made to `/api/jobs`, oldest first. */
  jobsRequests: URL[];
  /** Replace the dataset served from now on. */
  setJobs(jobs: MockJob[]): void;
  /** Make `/api/jobs` answer 500 (optionally only the full-set `limit=0` call). */
  failJobs(scope?: 'all' | 'full-set'): void;
  /** Stop failing. */
  recover(): void;
  lastJobsRequest(): URL | undefined;
  /** Every request made to `/api/search/suggest`. */
  suggestRequests: URL[];
  /** Replace what `/api/search/popular` answers. */
  setPopular(popular: MockSuggestion[]): void;
  /** Make the search-suggestion endpoints answer 503. */
  failSuggestions(): void;
}

type Failure = 'none' | 'all' | 'full-set';

const SOURCE_BY_KEY = new Map(MOCK_SOURCES.map((s) => [s.key, s]));

const escapeRe = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const asWord = (t: string) => new RegExp(`(^|[^a-z0-9])${escapeRe(t)}($|[^a-z0-9])`, 'i');

/** Same rule as the API: strong terms in title/description, ambiguous ones in the title only. */
function matchesRoles(job: MockJob, roles: string): boolean {
  return roles.split(',').some((key) => {
    const role = ROLES.find((r) => r.key === key);
    if (!role) return false;
    const text = `${job.title} ${job.excerpt} ${job.description}`;
    return role.strong.some((t) => asWord(t).test(text)) || role.title.some((t) => asWord(t).test(job.title));
  });
}

const POSTED_WINDOWS: Record<string, number> = {
  '24h': 24 * 3600_000,
  '7d': 7 * 24 * 3600_000,
  '30d': 30 * 24 * 3600_000,
};

function matches(job: MockJob, url: URL): boolean {
  const q = url.searchParams.get('q')?.trim().toLowerCase();
  if (q) {
    const label = SOURCE_BY_KEY.get(job.source)?.label.toLowerCase() ?? '';
    const hay = `${job.title} ${job.location} ${job.excerpt} ${job.description} ${label}`.toLowerCase();
    // Like the API: words match from their start ("reac" → React); 1-2 letter words must be whole.
    const found = (tok: string) =>
      new RegExp(`(^|[^a-z0-9])${escapeRe(tok)}${tok.length < 3 ? '($|[^a-z0-9])' : ''}`).test(hay);
    if (!q.split(/\s+/).every(found)) return false;
  }
  const role = url.searchParams.get('role');
  if (role && !matchesRoles(job, role)) return false;
  const window = POSTED_WINDOWS[url.searchParams.get('posted') ?? ''];
  if (window && (!job.added_at || Date.parse(job.added_at) < Date.now() - window)) return false;
  const kind = url.searchParams.get('kind');
  if (kind && SOURCE_BY_KEY.get(job.source)?.kind !== kind) return false;
  const category = url.searchParams.get('category');
  if (category && SOURCE_BY_KEY.get(job.source)?.category !== category) return false;
  return true;
}

function sorted(jobs: MockJob[], sort: string | null): MockJob[] {
  if (sort === 'oldest') return [...jobs].reverse();
  if (sort === 'hot') return [...jobs].sort((a, b) => Number(b.is_hot) - Number(a.is_hot));
  return jobs;
}

const norm = (s: string) => s.toLowerCase().replace(/[-_/]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Same idea as the API's ranking: exact > prefix > word start; role > skill > title > company > place. */
function suggest(q: string, limit: number): MockSuggestion[] {
  const needle = norm(q);
  if (!needle) return [];
  const order = ['role', 'skill', 'title', 'company', 'location'];
  const score = (e: MockSuggestion): number => {
    const label = norm(e.label);
    if (label === needle) return 1000;
    if (e.exact?.includes(needle)) return 700;
    if (label.startsWith(needle)) return 800;
    if (label.includes(` ${needle}`)) return 600;
    return 0;
  };
  return VOCAB.map((e) => ({ e, s: score(e) }))
    .filter((m) => m.s > 0)
    .sort((a, b) => b.s - a.s || order.indexOf(a.e.type) - order.indexOf(b.e.type) || b.e.count - a.e.count)
    .slice(0, limit)
    .map((m) => m.e);
}

const strip = ({ type, label, value, count }: MockSuggestion) => ({ type, label, value, count });

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export async function mockApi(page: Page, initialJobs: MockJob[] = MOCK_JOBS): Promise<ApiMock> {
  let jobs = initialJobs;
  let failure: Failure = 'none';
  let suggestionsDown = false;
  let popular: MockSuggestion[] = VOCAB.filter((e) => e.type === 'role' || e.type === 'skill')
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);
  const jobsRequests: URL[] = [];
  const suggestRequests: URL[] = [];

  await page.route('**/api/jobs**', (route) => {
    const url = new URL(route.request().url());
    jobsRequests.push(url);
    const limitParam = Number(url.searchParams.get('limit') ?? 30);
    const fullSet = limitParam <= 0;
    if (failure === 'all' || (failure === 'full-set' && fullSet)) {
      return route.fulfill(json({ message: 'boom' }, 500));
    }

    const filtered = sorted(jobs.filter((j) => matches(j, url)), url.searchParams.get('sort'));
    if (fullSet) {
      return route.fulfill(json({ region: 'all', count: filtered.length, jobs: filtered }));
    }
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const slice = filtered.slice(offset, offset + limitParam);
    return route.fulfill(
      json({
        jobs: slice,
        total: filtered.length,
        limit: limitParam,
        offset,
        has_more: offset + limitParam < filtered.length,
      }),
    );
  });

  // One offer, a company and a technology page (registered after the list route: the last one wins).
  await page.route('**/api/jobs/*/*', (route) => {
    const [, source, id] = new URL(route.request().url()).pathname.match(/\/api\/jobs\/([^/]+)\/([^/]+)$/) ?? [];
    const job = jobs.find((j) => j.source === source && j.external_id === decodeURIComponent(id ?? ''));
    return job ? route.fulfill(json(job)) : route.fulfill(json({ message: 'Offer not found' }, 404));
  });
  await page.route('**/api/seo/company/*', (route) => {
    const key = decodeURIComponent(new URL(route.request().url()).pathname.split('/').pop() ?? '');
    const source = SOURCE_BY_KEY.get(key);
    if (!source) return route.fulfill(json({ message: 'Company not found' }, 404));
    const own = jobs.filter((j) => j.source === key && !j.is_expired);
    const stack = new Map<string, number>();
    for (const j of own) {
      try {
        for (const s of (JSON.parse(j.ai_summary ?? '{}').stack ?? []) as string[]) stack.set(s, (stack.get(s) ?? 0) + 1);
      } catch { /* no summary */ }
    }
    const top_skills = [...stack.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([skill, count]) => ({ skill, count }));
    return route.fulfill(json({ source, total: own.length, jobs: own, top_skills }));
  });
  await page.route('**/api/seo/topic**', (route) => {
    const url = new URL(route.request().url());
    const slug = url.searchParams.get('tech') ?? '';
    const regionKey = url.searchParams.get('region') ?? 'all';
    const tech = VOCAB.filter((e) => e.type === 'role' || e.type === 'skill')
      .map((e) => ({ slug: e.label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''), label: e.label, value: e.value, type: e.type }))
      .find((t) => t.slug === slug);
    const region = MOCK_REGIONS.find((r) => r.key === regionKey);
    if (!tech || !region) return route.fulfill(json({ message: 'Page not found' }, 404));
    const own = jobs.filter((j) => !j.is_expired && `${j.title} ${j.excerpt} ${j.description}`.toLowerCase().includes(tech.value.toLowerCase()));
    return route.fulfill(json({ tech, region, total: own.length, jobs: own }));
  });

  await page.route('**/api/search/suggest**', (route) => {
    const url = new URL(route.request().url());
    suggestRequests.push(url);
    if (suggestionsDown) return route.fulfill(json({ message: 'down' }, 503));
    const limit = Number(url.searchParams.get('limit') ?? 8);
    return route.fulfill(json({ suggestions: suggest(url.searchParams.get('q') ?? '', limit).map(strip) }));
  });
  await page.route('**/api/search/popular**', (route) => {
    if (suggestionsDown) return route.fulfill(json({ message: 'down' }, 503));
    const limit = Number(new URL(route.request().url()).searchParams.get('limit') ?? 8);
    return route.fulfill(json({ popular: popular.slice(0, limit).map(strip) }));
  });

  await page.route('**/api/stats', (route) =>
    route.fulfill(json({ total: 856, new_this_week: 42, companies: 120, updated_at: new Date(Date.now() - 12 * 60_000).toISOString() })),
  );
  await page.route('**/api/sources', (route) => route.fulfill(json(MOCK_SOURCES)));
  await page.route('**/api/regions', (route) => route.fulfill(json(MOCK_REGIONS)));

  return {
    jobsRequests,
    setJobs: (next) => {
      jobs = next;
    },
    failJobs: (scope = 'all') => {
      failure = scope;
    },
    recover: () => {
      failure = 'none';
    },
    lastJobsRequest: () => jobsRequests.at(-1),
    suggestRequests,
    setPopular: (next) => {
      popular = next;
    },
    failSuggestions: () => {
      suggestionsDown = true;
    },
  };
}

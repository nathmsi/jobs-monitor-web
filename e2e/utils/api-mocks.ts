import type { Page } from '@playwright/test';

import { MOCK_JOBS, MOCK_REGIONS, MOCK_SOURCES, type MockJob } from '../fixtures/data';

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
}

type Failure = 'none' | 'all' | 'full-set';

const SOURCE_BY_KEY = new Map(MOCK_SOURCES.map((s) => [s.key, s]));

function matches(job: MockJob, url: URL): boolean {
  const q = url.searchParams.get('q')?.trim().toLowerCase();
  if (q) {
    const hay = `${job.title} ${job.excerpt} ${job.description}`.toLowerCase();
    if (!q.split(/\s+/).every((tok) => hay.includes(tok))) return false;
  }
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

const json = (body: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify(body),
});

export async function mockApi(page: Page, initialJobs: MockJob[] = MOCK_JOBS): Promise<ApiMock> {
  let jobs = initialJobs;
  let failure: Failure = 'none';
  const jobsRequests: URL[] = [];

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
  };
}

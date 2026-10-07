import type { Page } from '@playwright/test';

export const MOCK_JOBS = [
  {
    source: 'melio', external_id: 'e1', title: 'Frontend Engineer',
    location: 'Tel Aviv', excerpt: 'Build great things', description: '',
    url: 'https://example.com/job/1', is_hot: true, is_expired: false,
    last_updated: new Date().toISOString().slice(0, 10), is_new: true,
    ai_summary: null,
  },
  {
    source: 'monday', external_id: 'e2', title: 'Backend Developer',
    location: 'Remote', excerpt: 'Node.js expertise needed', description: '',
    url: 'https://example.com/job/2', is_hot: false, is_expired: false,
    last_updated: new Date().toISOString().slice(0, 10), is_new: false,
    ai_summary: null,
  },
  {
    source: 'ness', external_id: 'e3', title: 'Expired Role',
    location: 'Haifa', excerpt: 'Old posting', description: '',
    url: 'https://example.com/job/3', is_hot: false, is_expired: true,
    last_updated: '2026-01-01', is_new: false,
    ai_summary: null,
  },
];

export const MOCK_SOURCES = [
  { key: 'melio', label: 'Melio', kind: 'company', category: 'fintech', site_url: 'https://melio.com', auto_fetch: true, logo: null },
  { key: 'monday', label: 'monday.com', kind: 'company', category: 'devtools', site_url: 'https://monday.com', auto_fetch: true, logo: null },
  { key: 'ness', label: 'Ness', kind: 'agency', category: 'staffing', site_url: 'https://ness.com', auto_fetch: true, logo: null },
];

export const MOCK_REGIONS = [
  { key: 'all', label_en: 'All Israel', label_he: 'כל ישראל', label_fr: 'Tout Israël' },
  { key: 'tlv', label_en: 'Tel Aviv', label_he: 'תל אביב', label_fr: 'Tel Aviv' },
  { key: 'jerusalem', label_en: 'Jerusalem', label_he: 'ירושלים', label_fr: 'Jérusalem' },
];

/** Intercept all API calls and return deterministic mock data. */
export async function mockApi(page: Page, jobs: unknown[] = MOCK_JOBS) {
  await page.route('**/api/jobs**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        jobs,
        total: jobs.length,
        limit: 24,
        offset: 0,
        has_more: false,
      }),
    }),
  );

  await page.route('**/api/sources', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SOURCES) }),
  );

  await page.route('**/api/regions', (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_REGIONS) }),
  );
}

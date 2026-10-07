/** Deterministic API payloads shared by every spec. */

export interface MockJob {
  source: string;
  external_id: string;
  title: string;
  location: string;
  excerpt: string;
  description: string;
  url: string | null;
  is_hot: boolean;
  is_expired: boolean;
  last_updated: string | null;
  is_new: boolean;
  ai_summary?: string | null;
}

export interface MockSource {
  key: string;
  label: string;
  kind: 'company' | 'agency';
  category: string;
  site_url: string;
  auto_fetch: boolean;
  logo: string | null;
}

const TODAY = new Date().toISOString().slice(0, 10);

export function makeJob(overrides: Partial<MockJob> & Pick<MockJob, 'external_id' | 'title'>): MockJob {
  return {
    source: 'melio',
    location: 'Tel Aviv',
    excerpt: '',
    description: '',
    url: `https://example.com/job/${overrides.external_id}`,
    is_hot: false,
    is_expired: false,
    last_updated: TODAY,
    is_new: false,
    ai_summary: null,
    ...overrides,
  };
}

export const FRONTEND_JOB = makeJob({
  external_id: 'e1',
  title: 'Frontend Engineer',
  excerpt: 'Build great things',
  is_hot: true,
  is_new: true,
});

export const BACKEND_JOB = makeJob({
  external_id: 'e2',
  source: 'monday',
  title: 'Backend Developer',
  location: 'Remote',
  excerpt: 'Node.js expertise needed',
});

export const EXPIRED_JOB = makeJob({
  external_id: 'e3',
  source: 'ness',
  title: 'Expired Role',
  location: 'Haifa',
  excerpt: 'Old posting',
  is_expired: true,
  last_updated: '2026-01-01',
});

/** The default listing: one hot/new company job, one plain, one expired agency job. */
export const MOCK_JOBS: MockJob[] = [FRONTEND_JOB, BACKEND_JOB, EXPIRED_JOB];

/** An offer whose text matches a React/TypeScript profile (for "For me"). */
export const REACT_JOB = makeJob({
  external_id: 'r1',
  title: 'Product Engineer',
  description: 'We build with React and TypeScript every day.',
});

/** Offers for the search scenarios (mobile / frontend / backend disciplines). */
export const IOS_JOB = makeJob({
  external_id: 's1',
  title: 'Senior iOS Developer',
  description: 'Build the app in Swift.',
});

export const ANDROID_JOB = makeJob({
  external_id: 's2',
  source: 'monday',
  title: 'Android Engineer',
  description: 'Kotlin and Jetpack Compose.',
});

export const ANGULAR_JOB = makeJob({
  external_id: 's3',
  title: 'Web Engineer',
  description: 'You will work with Angular and RxJS.',
});

/** Mentions "scenarios" and "radios": must NOT be found by an "ios" search. */
export const DECOY_JOB = makeJob({
  external_id: 's4',
  title: 'Backend Developer',
  description: 'Handle many scenarios; ship to radios and studios.',
});

export const SEARCH_JOBS: MockJob[] = [IOS_JOB, ANDROID_JOB, ANGULAR_JOB, DECOY_JOB];

/** `count` generic offers, used to exercise pagination. */
export function makeJobs(count: number): MockJob[] {
  return Array.from({ length: count }, (_, i) =>
    makeJob({ external_id: `bulk-${i + 1}`, title: `Bulk Offer ${String(i + 1).padStart(2, '0')}` }),
  );
}

export const MOCK_SOURCES: MockSource[] = [
  { key: 'melio', label: 'Melio', kind: 'company', category: 'fintech', site_url: 'https://melio.com', auto_fetch: true, logo: null },
  { key: 'monday', label: 'monday.com', kind: 'company', category: 'devtools', site_url: 'https://monday.com', auto_fetch: true, logo: null },
  { key: 'ness', label: 'Ness', kind: 'agency', category: 'staffing', site_url: 'https://ness.com', auto_fetch: true, logo: null },
];

export const MOCK_REGIONS = [
  { key: 'all', label_en: 'All Israel', label_he: 'כל ישראל', label_fr: 'Tout Israël' },
  { key: 'tlv', label_en: 'Tel Aviv', label_he: 'תל אביב', label_fr: 'Tel Aviv' },
  { key: 'jerusalem', label_en: 'Jerusalem', label_he: 'ירושלים', label_fr: 'Jérusalem' },
];

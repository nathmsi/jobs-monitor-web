// Shapes returned by the jobs-monitor-api backend.

export interface Job {
  source: string;
  external_id: string;
  title: string;
  location: string;
  excerpt: string;
  description?: string;
  url: string | null;
  is_hot: boolean;
  last_updated: string | null;
  is_new: boolean;
}

export interface SourceInfo {
  key: string;
  label: string;
  kind: "agency" | "company" | string;
  category?: string; // e.g. "security", "fintech", "data-ai", "staffing"…
  via?: string; // "linkedin" for the LinkedIn-sourced companies
  site_url: string | null;
  auto_fetch: boolean;
  logo?: string | null;
}

export interface RegionJobs {
  region: string;
  count: number;
  jobs: Job[];
}

export interface RefreshResult {
  source: string;
  count: number;
  new_count: number;
  jobs: Job[];
  cached: boolean;
}

export interface RegionInfo {
  key: string;
  label_fr: string;
  label_he: string;
}

export interface Filters {
  region: string;
  q: string;
  role?: string; // active role preset key (OR-matches its keywords)
  category?: string; // active company category key (undefined = all)
}

// Shapes returned by the jobs-monitor-api backend.

export interface Job {
  source: string;
  external_id: string;
  title: string;
  location: string;
  excerpt: string;
  url: string | null;
  is_hot: boolean;
  last_updated: string | null;
  is_new: boolean;
}

export interface SourceInfo {
  key: string;
  label: string;
  kind: "agency" | "company" | string;
  site_url: string | null;
  auto_fetch: boolean;
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
}

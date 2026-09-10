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
  site_url: string | null;
}

export interface RefreshResult {
  source: string;
  count: number;
  new_count: number;
  jobs: Job[];
}

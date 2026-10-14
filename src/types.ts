// Shapes returned by the jobs-monitor-api backend.

export interface Job {
  source: string;
  external_id: string;
  title: string;
  location: string;
  excerpt: string;
  description?: string;
  ai_summary?: string;
  url: string | null;
  is_hot: boolean;
  is_expired: boolean;
  last_updated: string | null;
  /** When the offer was first seen (ISO-8601). */
  added_at?: string | null;
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
  label_en: string;
  label_fr?: string;
  label_he: string;
}

/** How recently an offer was added. */
export type Posted = "24h" | "7d" | "30d";

export interface Filters {
  region: string;
  q: string;
  roles: string[]; // active role preset keys (any of them matches)
  category?: string; // active company category key (undefined = all)
  posted?: Posted; // only offers added within this window
}

export interface PublicTech {
  slug: string;
  label: string;
  value: string;
  type: "role" | "skill";
}

export interface CompanyPageData {
  source: SourceInfo;
  total: number;
  jobs: Job[];
  top_skills: { skill: string; count: number }[];
}

export interface TopicPageData {
  tech: PublicTech;
  region: RegionInfo;
  total: number;
  jobs: Job[];
}

import type { RegionInfo, SourceInfo, Job } from "../../src/types";

/**
 * What an offer is when a test does not say otherwise. The ONE place these defaults live: the
 * Vitest `makeJob` below and the Playwright one (e2e/fixtures/data.ts) both start from it.
 */
export const JOB_DEFAULTS = {
  source: "melio",
  location: "Tel Aviv",
  excerpt: "",
  description: "",
  is_hot: false,
  is_expired: false,
  last_updated: null,
  is_new: false,
} as const;

export function makeJob(overrides: Partial<Job> & Pick<Job, "external_id" | "title">): Job {
  return {
    ...JOB_DEFAULTS,
    url: `https://example.com/job/${overrides.external_id}`,
    ...overrides,
  };
}

export function makeSource(overrides: Partial<SourceInfo> & Pick<SourceInfo, "key">): SourceInfo {
  return {
    label: overrides.key,
    kind: "company",
    site_url: null,
    auto_fetch: true,
    ...overrides,
  };
}

export const SOURCES: SourceInfo[] = [
  makeSource({ key: "melio", label: "Melio", kind: "company", category: "fintech" }),
  makeSource({ key: "ness", label: "Ness", kind: "agency", category: "staffing" }),
];

export const REGIONS: RegionInfo[] = [
  { key: "all", label_en: "All Israel", label_he: "כל ישראל", label_fr: "Tout Israël" },
  { key: "tlv", label_en: "Tel Aviv", label_he: "תל אביב", label_fr: "Tel Aviv" },
];

export const CV_PROFILE = {
  skills: ["React", "TypeScript"],
  roles: ["frontend"],
  languages: [],
  seniority: "Senior",
  years: 5,
  locations: [],
  titles: [],
  education: [],
  certifications: [],
};

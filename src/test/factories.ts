import type { RegionInfo, SourceInfo, Job } from "../types";

export function makeJob(overrides: Partial<Job> & Pick<Job, "external_id" | "title">): Job {
  return {
    source: "melio",
    location: "Tel Aviv",
    excerpt: "",
    description: "",
    url: `https://example.com/job/${overrides.external_id}`,
    is_hot: false,
    is_expired: false,
    last_updated: null,
    is_new: false,
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

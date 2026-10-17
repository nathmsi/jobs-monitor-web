import { vi } from "vitest";

import * as client from "../../../src/api/client";
import type { Job, SourceInfo } from "../../../src/types";
import { matchesAnyRole } from "../fakeApi/matchesRole";
import { REGIONS, SOURCES } from "../factories";

/** A small vocabulary: what the API would suggest for these offers. */
export const SUGGESTIONS: client.Suggestion[] = [
  { type: "role", label: "Mobile", value: "mobile", count: 37 },
  { type: "role", label: "Frontend", value: "frontend", count: 65 },
  { type: "skill", label: "React", value: "React", count: 16 },
  { type: "skill", label: "React Native", value: "React Native", count: 5 },
  { type: "skill", label: "iOS", value: "iOS", count: 9 },
  { type: "title", label: "Senior", value: "Senior", count: 215 },
  { type: "company", label: "Melio", value: "Melio", count: 5 },
  { type: "location", label: "Tel Aviv", value: "Tel Aviv", count: 316 },
];

interface Options {
  jobs?: Job[];
  sources?: SourceInfo[];
  suggestions?: client.Suggestion[];
}

/**
 * Replaces the backend client with an in-memory implementation that honours
 * the filters the UI sends (q, kind, sort, limit/offset). Returns the spies so
 * tests can assert on the requests that were made.
 */
export function mockBackend({ jobs = [], sources = SOURCES, suggestions = SUGGESTIONS }: Options = {}) {
  const kindOf = (key: string) => sources.find((s) => s.key === key)?.kind;

  const getJobsPage = vi.spyOn(client, "getJobsPage").mockImplementation(async (query) => {
    let found = jobs.filter((j) => {
      if (query.kind && kindOf(j.source) !== query.kind) return false;
      if (query.role && !matchesAnyRole(j, query.role)) return false;
      if (query.q) {
        const hay = `${j.title} ${j.excerpt} ${j.description ?? ""}`.toLowerCase();
        return query.q.toLowerCase().split(/\s+/).every((tok) => hay.includes(tok));
      }
      return true;
    });
    if (query.sort === "oldest") found = [...found].reverse();
    const limit = query.limit ?? 30;
    const offset = query.offset ?? 0;
    return {
      jobs: found.slice(offset, offset + limit),
      total: found.length,
      limit,
      offset,
      has_more: offset + limit < found.length,
    };
  });
  const getRegionJobs = vi.spyOn(client, "getRegionJobs").mockResolvedValue(jobs);
  const getSources = vi.spyOn(client, "getSources").mockResolvedValue(sources);
  const getRegions = vi.spyOn(client, "getRegions").mockResolvedValue(REGIONS);
  const getStats = vi
    .spyOn(client, "getStats")
    .mockResolvedValue({ total: jobs.length, new_this_week: Math.min(jobs.length, 2), companies: sources.length, updated_at: new Date(Date.now() - 12 * 60_000).toISOString() });

  const getSuggestions = vi.spyOn(client, "getSuggestions").mockImplementation(async (q) => {
    const needle = q.trim().toLowerCase();
    return suggestions.filter((s) => s.label.toLowerCase().includes(needle)).slice(0, 8);
  });
  const getPopular = vi
    .spyOn(client, "getPopular")
    .mockImplementation(async (limit = 8) => [...suggestions].filter((s) => s.type !== "company" && s.type !== "location" && s.type !== "title").slice(0, limit));

  // One offer, and one company with its open offers (the public pages). Unknown: the API's 404.
  const getJob = vi.spyOn(client, "getJob").mockImplementation(async (source, externalId) => {
    const job = jobs.find((j) => j.source === source && j.external_id === externalId);
    if (!job) throw new Error("HTTP 404 — Not Found");
    return job;
  });
  const getCompany = vi.spyOn(client, "getCompany").mockImplementation(async (key) => {
    const source = sources.find((s) => s.key === key);
    if (!source) throw new Error("HTTP 404 — Not Found");
    const own = jobs.filter((j) => j.source === key && !j.is_expired);
    return { source, total: own.length, jobs: own, top_skills: [] };
  });

  return { getJobsPage, getRegionJobs, getSources, getRegions, getStats, getSuggestions, getPopular, getJob, getCompany };
}

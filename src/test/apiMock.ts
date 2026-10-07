import { vi } from "vitest";

import * as client from "../api/client";
import { ROLES } from "../constants/roles";
import type { Job, SourceInfo } from "../types";
import { REGIONS, SOURCES } from "./factories";

const escape = (t: string) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const word = (t: string) => new RegExp(`(^|[^a-z0-9])${escape(t)}($|[^a-z0-9])`, "i");

/** Same rule as the API: strong terms in title/description, ambiguous ones in the title only. */
function matchesAnyRole(job: Job, roles: string): boolean {
  return roles.split(",").some((key) => {
    const role = ROLES.find((r) => r.key === key);
    if (!role) return false;
    const text = `${job.title} ${job.excerpt} ${job.description ?? ""}`;
    return role.strong.some((t) => word(t).test(text)) || role.title.some((t) => word(t).test(job.title));
  });
}

interface Options {
  jobs?: Job[];
  sources?: SourceInfo[];
}

/**
 * Replaces the backend client with an in-memory implementation that honours
 * the filters the UI sends (q, kind, sort, limit/offset). Returns the spies so
 * tests can assert on the requests that were made.
 */
export function mockBackend({ jobs = [], sources = SOURCES }: Options = {}) {
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

  return { getJobsPage, getRegionJobs, getSources, getRegions };
}

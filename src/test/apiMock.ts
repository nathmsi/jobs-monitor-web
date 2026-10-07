import { vi } from "vitest";

import * as client from "../api/client";
import type { Job, SourceInfo } from "../types";
import { REGIONS, SOURCES } from "./factories";

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

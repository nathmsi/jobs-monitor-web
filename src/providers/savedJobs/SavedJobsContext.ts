import { createContext } from "react";

import type { Job } from "../../types";

// Per-user "saved" / "applied" jobs. Backed by Supabase (table saved_jobs,
// protected by RLS) when signed in; falls back to localStorage otherwise so
// the feature still works logged-out (per-device).

export type SavedStatus = "saved" | "applied";

export interface SavedItem {
  source: string;
  external_id: string;
  status: SavedStatus;
  title?: string | null;
  company?: string | null;
  location?: string | null;
  url?: string | null;
}

/** The part of a Job that is stored with a saved entry. */
export type JobSnapshot = Pick<Job, "source" | "external_id" | "title" | "location" | "url">;

export interface SavedJobsValue {
  ready: boolean;
  statusOf: (source: string, externalId: string) => SavedStatus | undefined;
  /** Resolves to false when the remote write failed (the change is rolled back). */
  setStatus: (job: JobSnapshot, status: SavedStatus | null, company?: string) => Promise<boolean>;
  /** Change / remove status from an already-saved item (in "My jobs"). */
  changeStatus: (item: SavedItem, status: SavedStatus | null) => Promise<boolean>;
  items: SavedItem[];
  savedCount: number;
  appliedCount: number;
}

export const SavedJobsContext = createContext<SavedJobsValue | null>(null);

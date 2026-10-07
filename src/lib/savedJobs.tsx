import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth";
import { jobId } from "./jobFlags";
import { supabase } from "./supabase";
import type { Job } from "../types";

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

const LOCAL_KEY = "savedJobs.local.v1";

function loadLocal(): Map<string, SavedItem> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? (JSON.parse(raw) as SavedItem[]) : [];
    return new Map(arr.map((it) => [jobId(it.source, it.external_id), it]));
  } catch {
    return new Map();
  }
}

function saveLocal(map: Map<string, SavedItem>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...map.values()]));
  } catch {
    /* ignore */
  }
}

interface SavedJobsValue {
  ready: boolean;
  statusOf: (source: string, externalId: string) => SavedStatus | undefined;
  /** Resolves to false when the remote write failed (the change is rolled back). */
  setStatus: (job: Job, status: SavedStatus | null, company?: string) => Promise<boolean>;
  /** Change / remove status from an already-saved item (in "My jobs"). */
  changeStatus: (item: SavedItem, status: SavedStatus | null) => Promise<boolean>;
  items: SavedItem[];
  savedCount: number;
  appliedCount: number;
}

const Ctx = createContext<SavedJobsValue | null>(null);

const EMPTY = new Map<string, SavedItem>();

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const useRemote = Boolean(enabled && userId && supabase);
  const queryKey = useMemo(() => ["saved-jobs", userId ?? "local"] as const, [userId]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<Map<string, SavedItem>> => {
      if (!useRemote || !supabase) return loadLocal();
      const { data, error } = await supabase
        .from("saved_jobs")
        .select("source, external_id, status, title, company, location, url");
      // fall back to local on error so the UI still works
      if (error || !data) return loadLocal();
      return new Map(
        (data as SavedItem[]).map((it) => [jobId(it.source, it.external_id), it]),
      );
    },
    placeholderData: loadLocal,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const map = query.data ?? EMPTY;
  const ready = query.isSuccess && !query.isPlaceholderData;

  const setStatus = useCallback(
    async (job: Job, status: SavedStatus | null, company?: string): Promise<boolean> => {
      const key = jobId(job.source, job.external_id);
      const item: SavedItem = {
        source: job.source,
        external_id: job.external_id,
        status: status ?? "saved",
        title: job.title,
        company: company ?? null,
        location: job.location,
        url: job.url,
      };

      // Optimistic update, computed from the cache (never inside an updater).
      const current = () => qc.getQueryData<Map<string, SavedItem>>(queryKey) ?? EMPTY;
      const before = current().get(key);
      const next = new Map(current());
      if (status === null) next.delete(key);
      else next.set(key, item);
      qc.setQueryData(queryKey, next);

      if (!(useRemote && supabase && userId)) {
        saveLocal(next);
        return true;
      }

      const table = supabase.from("saved_jobs");
      const { error } =
        status === null
          ? await table.delete().match({ source: job.source, external_id: job.external_id })
          : await table.upsert(
              {
                user_id: userId,
                source: job.source,
                external_id: job.external_id,
                status,
                title: job.title,
                company: company ?? null,
                location: job.location,
                url: job.url,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "user_id,source,external_id" },
            );
      if (!error) return true;

      console.error("saved_jobs write", error.message);
      // Roll back only this entry so concurrent changes are preserved.
      const reverted = new Map(current());
      if (before) reverted.set(key, before);
      else reverted.delete(key);
      qc.setQueryData(queryKey, reverted);
      return false;
    },
    [qc, queryKey, useRemote, userId],
  );

  const changeStatus = useCallback(
    (item: SavedItem, status: SavedStatus | null): Promise<boolean> => {
      // Reuse setStatus with a minimal Job built from the stored snapshot.
      const job = {
        source: item.source,
        external_id: item.external_id,
        title: item.title ?? "",
        location: item.location ?? "",
        url: item.url ?? null,
      } as Job;
      return setStatus(job, status, item.company ?? undefined);
    },
    [setStatus],
  );

  const value = useMemo<SavedJobsValue>(() => {
    const items = [...map.values()];
    return {
      ready,
      statusOf: (source, externalId) => map.get(jobId(source, externalId))?.status,
      setStatus,
      changeStatus,
      items,
      savedCount: items.filter((i) => i.status === "saved").length,
      appliedCount: items.filter((i) => i.status === "applied").length,
    };
  }, [map, ready, setStatus, changeStatus]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useSavedJobs(): SavedJobsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSavedJobs must be used within SavedJobsProvider");
  return ctx;
}

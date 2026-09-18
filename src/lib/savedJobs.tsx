import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

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
  setStatus: (job: Job, status: SavedStatus | null, company?: string) => void;
  /** Change / remove status from an already-saved item (in "My jobs"). */
  changeStatus: (item: SavedItem, status: SavedStatus | null) => void;
  items: SavedItem[];
  savedCount: number;
  appliedCount: number;
}

const Ctx = createContext<SavedJobsValue | null>(null);

export function SavedJobsProvider({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();
  const [map, setMap] = useState<Map<string, SavedItem>>(() => loadLocal());
  const [ready, setReady] = useState(false);

  const useRemote = Boolean(enabled && user && supabase);

  // Load the right store when auth state settles.
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (useRemote && supabase) {
        const { data, error } = await supabase
          .from("saved_jobs")
          .select("source, external_id, status, title, company, location, url");
        if (cancelled) return;
        if (error) {
          // fall back to local on error so the UI still works
          setMap(loadLocal());
        } else {
          setMap(
            new Map(
              (data as SavedItem[]).map((it) => [
                jobId(it.source, it.external_id),
                it,
              ]),
            ),
          );
        }
      } else {
        setMap(loadLocal());
      }
      setReady(true);
    }
    setReady(false);
    load();
    return () => {
      cancelled = true;
    };
  }, [useRemote, user?.id]);

  const setStatus = useCallback(
    (job: Job, status: SavedStatus | null, company?: string) => {
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

      // Optimistic local update.
      setMap((prev) => {
        const next = new Map(prev);
        if (status === null) next.delete(key);
        else next.set(key, item);
        if (!useRemote) saveLocal(next);
        return next;
      });

      if (useRemote && supabase && user) {
        if (status === null) {
          supabase
            .from("saved_jobs")
            .delete()
            .match({ source: job.source, external_id: job.external_id })
            .then(({ error }) => {
              if (error) console.error("saved_jobs delete", error.message);
            });
        } else {
          supabase
            .from("saved_jobs")
            .upsert(
              {
                user_id: user.id,
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
            )
            .then(({ error }) => {
              if (error) console.error("saved_jobs upsert", error.message);
            });
        }
      }
    },
    [useRemote, user],
  );

  const changeStatus = useCallback(
    (item: SavedItem, status: SavedStatus | null) => {
      // Reuse setStatus with a minimal Job built from the stored snapshot.
      const job = {
        source: item.source,
        external_id: item.external_id,
        title: item.title ?? "",
        location: item.location ?? "",
        url: item.url ?? null,
      } as Job;
      setStatus(job, status, item.company ?? undefined);
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

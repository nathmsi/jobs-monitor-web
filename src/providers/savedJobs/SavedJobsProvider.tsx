import { useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../../services/supabase";
import { jobId } from "../../utils/jobId";
import { useAuth } from "../auth/useAuth";
import {
  SavedJobsContext,
  type JobSnapshot,
  type SavedItem,
  type SavedJobsValue,
  type SavedStatus,
} from "./SavedJobsContext";
import { loadLocal, saveLocal } from "./savedJobsStorage";

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
    async (job: JobSnapshot, status: SavedStatus | null, company?: string): Promise<boolean> => {
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
    (item: SavedItem, status: SavedStatus | null): Promise<boolean> =>
      setStatus(
        {
          source: item.source,
          external_id: item.external_id,
          title: item.title ?? "",
          location: item.location ?? "",
          url: item.url ?? null,
        },
        status,
        item.company ?? undefined,
      ),
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

  return <SavedJobsContext.Provider value={value}>{children}</SavedJobsContext.Provider>;
}

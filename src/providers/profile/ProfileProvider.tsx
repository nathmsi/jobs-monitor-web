import { useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../../services/supabase";
import { normalizeProfile, type CvProfile } from "../../utils/cvAnalysis";
import { useAuth } from "../auth/useAuth";
import { ProfileContext, type ProfileValue } from "./ProfileContext";
import { loadLocalProfile, PROFILE_LOCAL_KEY } from "./profileStorage";

// Per-user CV profile. Backed by Supabase (table profiles, RLS) when signed in,
// localStorage otherwise. Only the extracted profile is stored — never the raw CV.

export function ProfileProvider({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const useRemote = Boolean(enabled && userId && supabase);
  const queryKey = useMemo(() => ["profile", userId ?? "local"] as const, [userId]);

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<CvProfile | null> => {
      if (!useRemote || !supabase || !userId) return loadLocalProfile();
      const { data, error } = await supabase
        .from("profiles")
        .select("data")
        .eq("user_id", userId)
        .maybeSingle();
      return (!error && data?.data ? normalizeProfile(data.data) : null) ?? loadLocalProfile();
    },
    placeholderData: loadLocalProfile,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });

  const profile = query.data ?? null;
  const ready = query.isSuccess && !query.isPlaceholderData;

  const saveProfile = useCallback(
    (p: CvProfile) => {
      const withTs = { ...p, updatedAt: new Date().toISOString() };
      qc.setQueryData(queryKey, withTs);
      if (useRemote && supabase && userId) {
        supabase
          .from("profiles")
          .upsert(
            { user_id: userId, data: withTs, updated_at: withTs.updatedAt },
            { onConflict: "user_id" },
          )
          .then(({ error }) => {
            if (error) console.error("profiles upsert", error.message);
          });
      } else {
        try {
          localStorage.setItem(PROFILE_LOCAL_KEY, JSON.stringify(withTs));
        } catch {
          /* ignore */
        }
      }
    },
    [qc, queryKey, useRemote, userId],
  );

  const clearProfile = useCallback(() => {
    qc.setQueryData(queryKey, null);
    if (useRemote && supabase && userId) {
      supabase
        .from("profiles")
        .delete()
        .eq("user_id", userId)
        .then(({ error }) => {
          if (error) console.error("profiles delete", error.message);
        });
    } else {
      try {
        localStorage.removeItem(PROFILE_LOCAL_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [qc, queryKey, useRemote, userId]);

  const value = useMemo<ProfileValue>(
    () => ({ ready, profile, saveProfile, clearProfile }),
    [ready, profile, saveProfile, clearProfile],
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

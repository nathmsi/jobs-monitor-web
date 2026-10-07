import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth";
import { normalizeProfile, type CvProfile } from "./cvAnalysis";
import { supabase } from "./supabase";

// Per-user CV profile. Backed by Supabase (table profiles, RLS) when signed in,
// localStorage otherwise. Only the extracted profile is stored — never the raw CV.

const LOCAL_KEY = "cvProfile.local.v1";

export function loadLocalProfile(): CvProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

interface ProfileValue {
  ready: boolean;
  profile: CvProfile | null;
  saveProfile: (p: CvProfile) => void;
  clearProfile: () => void;
}

const Ctx = createContext<ProfileValue | null>(null);

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
          localStorage.setItem(LOCAL_KEY, JSON.stringify(withTs));
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
        localStorage.removeItem(LOCAL_KEY);
      } catch {
        /* ignore */
      }
    }
  }, [qc, queryKey, useRemote, userId]);

  const value = useMemo<ProfileValue>(
    () => ({ ready, profile, saveProfile, clearProfile }),
    [ready, profile, saveProfile, clearProfile],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

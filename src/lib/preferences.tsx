import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth";
import { supabase } from "./supabase";

export interface JobPreferences {
  region: string;
  kind: "all" | "company" | "agency";
  roles: string[];
  categories: string[];
}

const DEFAULT: JobPreferences = {
  region: "all",
  kind: "all",
  roles: [],
  categories: [],
};

const LOCAL_KEY = "jobPreferences.v1";

export function mergePrefs(raw: Partial<JobPreferences>): JobPreferences {
  return {
    ...DEFAULT,
    ...raw,
    roles: Array.isArray(raw.roles) ? raw.roles : DEFAULT.roles,
    categories: Array.isArray(raw.categories) ? raw.categories : DEFAULT.categories,
  };
}

export function loadLocalPrefs(): JobPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? mergePrefs(JSON.parse(raw) as Partial<JobPreferences>) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function persistLocal(p: JobPreferences): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

interface PreferencesValue {
  prefs: JobPreferences;
  savePrefs: (p: JobPreferences) => Promise<void>;
}

const Ctx = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const useRemote = Boolean(enabled && userId && supabase);
  const queryKey = useMemo(() => ["preferences", userId ?? "local"] as const, [userId]);

  const { data } = useQuery({
    queryKey,
    queryFn: async (): Promise<JobPreferences> => {
      if (!useRemote || !supabase || !userId) return loadLocalPrefs();
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", userId)
        .maybeSingle();
      if (error || !data?.preferences) return loadLocalPrefs();
      const remote = mergePrefs(data.preferences as Partial<JobPreferences>);
      persistLocal(remote);
      return remote;
    },
    placeholderData: loadLocalPrefs,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const prefs = data ?? DEFAULT;

  const savePrefs = useCallback(
    async (p: JobPreferences) => {
      qc.setQueryData(queryKey, p);
      // Always persist locally as fallback
      persistLocal(p);

      if (useRemote && supabase && userId) {
        const { error } = await supabase
          .from("profiles")
          .upsert({ user_id: userId, preferences: p }, { onConflict: "user_id" });
        if (error) console.error("preferences upsert", error.message);
      }
    },
    [qc, queryKey, useRemote, userId],
  );

  const value = useMemo(() => ({ prefs, savePrefs }), [prefs, savePrefs]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}

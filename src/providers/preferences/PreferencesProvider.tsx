import { useCallback, useMemo, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { supabase } from "../../services/supabase";
import { useAuth } from "../auth/useAuth";
import { PreferencesContext, type JobPreferences } from "./PreferencesContext";
import { DEFAULT_PREFERENCES, loadLocalPrefs, mergePrefs, persistLocalPrefs } from "./preferencesStorage";

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
      persistLocalPrefs(remote);
      return remote;
    },
    placeholderData: loadLocalPrefs,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const prefs = data ?? DEFAULT_PREFERENCES;

  const savePrefs = useCallback(
    async (p: JobPreferences) => {
      qc.setQueryData(queryKey, p);
      // Always persist locally as fallback
      persistLocalPrefs(p);

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

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

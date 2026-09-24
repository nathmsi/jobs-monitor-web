import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

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

function loadLocal(): JobPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? { ...DEFAULT, ...(JSON.parse(raw) as Partial<JobPreferences>) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

interface PreferencesValue {
  prefs: JobPreferences;
  savePrefs: (p: JobPreferences) => Promise<void>;
}

const Ctx = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { user, enabled } = useAuth();
  const [prefs, setPrefs] = useState<JobPreferences>(loadLocal);

  const useRemote = Boolean(enabled && user && supabase);

  // Load from Supabase on sign-in
  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!useRemote || !supabase || !user) return;
      const { data, error } = await supabase
        .from("profiles")
        .select("preferences")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (!error && data?.preferences) {
        const remote = { ...DEFAULT, ...(data.preferences as Partial<JobPreferences>) };
        setPrefs(remote);
        localStorage.setItem(LOCAL_KEY, JSON.stringify(remote));
      }
    }
    load();
    return () => { cancelled = true; };
  }, [useRemote, user?.id]);

  const savePrefs = useCallback(
    async (p: JobPreferences) => {
      setPrefs(p);
      // Always persist locally as fallback
      try { localStorage.setItem(LOCAL_KEY, JSON.stringify(p)); } catch { /* ignore */ }

      if (useRemote && supabase && user) {
        const { error } = await supabase
          .from("profiles")
          .upsert(
            { user_id: user.id, preferences: p },
            { onConflict: "user_id" },
          );
        if (error) console.error("preferences upsert", error.message);
      }
    },
    [useRemote, user],
  );

  return <Ctx.Provider value={{ prefs, savePrefs }}>{children}</Ctx.Provider>;
}

export function usePreferences(): PreferencesValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}

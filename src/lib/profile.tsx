import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { useAuth } from "./auth";
import { supabase } from "./supabase";
import type { CvProfile } from "./cvAnalysis";

// Per-user CV profile. Backed by Supabase (table profiles, RLS) when signed in,
// localStorage otherwise. Only the extracted profile is stored — never the raw CV.

const LOCAL_KEY = "cvProfile.local.v1";

function loadLocal(): CvProfile | null {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? (JSON.parse(raw) as CvProfile) : null;
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
  const [profile, setProfile] = useState<CvProfile | null>(() => loadLocal());
  const [ready, setReady] = useState(false);

  const useRemote = Boolean(enabled && user && supabase);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      if (useRemote && supabase && user) {
        const { data, error } = await supabase
          .from("profiles")
          .select("data")
          .eq("user_id", user.id)
          .maybeSingle();
        if (cancelled) return;
        setProfile(!error && data?.data ? (data.data as CvProfile) : loadLocal());
      } else {
        setProfile(loadLocal());
      }
      setReady(true);
    }
    setReady(false);
    load();
    return () => {
      cancelled = true;
    };
  }, [useRemote, user?.id]);

  const value = useMemo<ProfileValue>(
    () => ({
      ready,
      profile,
      saveProfile: (p) => {
        const withTs = { ...p, updatedAt: new Date().toISOString() };
        setProfile(withTs);
        if (useRemote && supabase && user) {
          supabase
            .from("profiles")
            .upsert(
              { user_id: user.id, data: withTs, updated_at: withTs.updatedAt },
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
      clearProfile: () => {
        setProfile(null);
        if (useRemote && supabase && user) {
          supabase
            .from("profiles")
            .delete()
            .eq("user_id", user.id)
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
      },
    }),
    [ready, profile, useRemote, user],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useProfile(): ProfileValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useProfile must be used within ProfileProvider");
  return ctx;
}

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase, supabaseEnabled } from "./supabase";

const API_BASE = import.meta.env.VITE_API_URL ?? "https://jobs-monitor-api.onrender.com";
const SUPPORTED_LOCALES = ["en", "fr", "he"] as const;

function detectLocale(): "en" | "fr" | "he" {
  const lang = navigator.language.slice(0, 2).toLowerCase();
  return (SUPPORTED_LOCALES.includes(lang as "en" | "fr" | "he") ? lang : "en") as "en" | "fr" | "he";
}

function isNewUser(user: User): boolean {
  return Date.now() - new Date(user.created_at).getTime() < 30_000;
}

async function triggerWelcomeEmail(user: User): Promise<void> {
  try {
    const name = (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? "there";
    await fetch(`${API_BASE}/api/email/welcome`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: user.email, name, locale: detectLocale() }),
    });
  } catch {
    // non-blocking — email failure must never break the login flow
  }
}

interface AuthValue {
  /** true once the initial session check has resolved */
  ready: boolean;
  /** whether Supabase is configured at all */
  enabled: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [ready, setReady] = useState(!supabaseEnabled);

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" && s?.user && isNewUser(s.user)) {
        triggerWelcomeEmail(s.user);
      }
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      ready,
      enabled: supabaseEnabled,
      user: session?.user ?? null,
      signInWithGoogle: async () => {
        if (!supabase) return;
        await supabase.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: window.location.origin },
        });
      },
      signOut: async () => {
        if (!supabase) return;
        await supabase.auth.signOut();
      },
    }),
    [ready, session],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}

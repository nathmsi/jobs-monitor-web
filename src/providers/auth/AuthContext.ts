import { createContext } from "react";
import type { User } from "@supabase/supabase-js";

export interface AuthValue {
  /** true once the initial session check has resolved */
  ready: boolean;
  /** whether Supabase is configured at all */
  enabled: boolean;
  user: User | null;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthValue | null>(null);

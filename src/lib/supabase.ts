import { createClient } from "@supabase/supabase-js";

// Public config — the anon key is safe to ship to the browser; per-user access
// is enforced by Row Level Security in Supabase.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/** True when Supabase is configured — lets the app run (localStorage-only)
 *  before the env vars are set, then light up auth once they are. */
export const supabaseEnabled = Boolean(url && anonKey);

export const supabase = supabaseEnabled
  ? createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;

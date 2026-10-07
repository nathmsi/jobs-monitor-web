import { useCallback, useEffect, useState } from "react";

import { useAuth } from "./auth";
import { supabase } from "./supabase";

export interface Cv {
  id: string;
  name: string;
  text: string;
  created_at: string;
}

/**
 * Per-user library of saved CVs, backed by the Supabase `cvs` table (RLS: a
 * user only sees their own rows). Only available when signed in.
 */
export function useCvs() {
  const { user } = useAuth();
  const [cvs, setCvs] = useState<Cv[]>([]);
  const [ready, setReady] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase || !user) {
      setCvs([]);
      setSelectedId(null);
      setReady(true);
      return;
    }
    const { data, error } = await supabase
      .from("cvs")
      .select("id,name,text,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (!error && data) {
      setCvs(data as Cv[]);
      setSelectedId((prev) => prev ?? (data[0] as Cv | undefined)?.id ?? null);
    }
    setReady(true);
  }, [user]);

  useEffect(() => {
    setReady(false);
    load();
  }, [load]);

  const addCv = useCallback(
    async (name: string, text: string): Promise<Cv | null> => {
      if (!supabase || !user) return null;
      const { data, error } = await supabase
        .from("cvs")
        .insert({ user_id: user.id, name, text })
        .select("id,name,text,created_at")
        .single();
      if (error || !data) return null;
      const cv = data as Cv;
      setCvs((c) => [cv, ...c]);
      setSelectedId(cv.id);
      return cv;
    },
    [user],
  );

  const removeCv = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase || !user) return false;
      const { error } = await supabase.from("cvs").delete().eq("id", id);
      if (error) {
        console.error("cvs delete", error.message);
        return false;
      }
      setCvs((c) => c.filter((x) => x.id !== id));
      setSelectedId((prev) => (prev === id ? null : prev));
      return true;
    },
    [user],
  );

  const selectedCv = cvs.find((c) => c.id === selectedId) ?? null;

  return {
    signedIn: Boolean(user),
    ready,
    cvs,
    selectedCv,
    selectedId,
    selectCv: setSelectedId,
    addCv,
    removeCv,
  };
}

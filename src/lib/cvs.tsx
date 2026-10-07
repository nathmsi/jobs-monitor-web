import { useCallback, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useAuth } from "./auth";
import { supabase } from "./supabase";

export interface Cv {
  id: string;
  name: string;
  text: string;
  created_at: string;
}

const NO_CVS: Cv[] = [];

/**
 * Per-user library of saved CVs, backed by the Supabase `cvs` table (RLS: a
 * user only sees their own rows). Only available when signed in. The list is
 * cached in react-query so every consumer shares one fetch.
 */
export function useCvs() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const userId = user?.id;
  const queryKey = useMemo(() => ["cvs", userId] as const, [userId]);
  const [pickedId, setPickedId] = useState<string | null>(null);

  const query = useQuery({
    queryKey,
    enabled: Boolean(supabase && userId),
    staleTime: Infinity,
    queryFn: async (): Promise<Cv[]> => {
      if (!supabase || !userId) return NO_CVS;
      const { data, error } = await supabase
        .from("cvs")
        .select("id,name,text,created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      if (error) throw new Error(error.message);
      return (data ?? []) as Cv[];
    },
  });

  const cvs = userId ? (query.data ?? NO_CVS) : NO_CVS;
  const ready = !userId || !supabase || !query.isPending;
  // Default to the newest CV until the user picks another one.
  const selectedId = cvs.some((c) => c.id === pickedId) ? pickedId : (cvs[0]?.id ?? null);
  const selectedCv = cvs.find((c) => c.id === selectedId) ?? null;

  const addCv = useCallback(
    async (name: string, text: string): Promise<Cv | null> => {
      if (!supabase || !userId) return null;
      const { data, error } = await supabase
        .from("cvs")
        .insert({ user_id: userId, name, text })
        .select("id,name,text,created_at")
        .single();
      if (error || !data) return null;
      const cv = data as Cv;
      qc.setQueryData<Cv[]>(queryKey, (prev) => [cv, ...(prev ?? [])]);
      setPickedId(cv.id);
      return cv;
    },
    [qc, queryKey, userId],
  );

  const removeCv = useCallback(
    async (id: string): Promise<boolean> => {
      if (!supabase || !userId) return false;
      const { error } = await supabase.from("cvs").delete().eq("id", id);
      if (error) {
        console.error("cvs delete", error.message);
        return false;
      }
      qc.setQueryData<Cv[]>(queryKey, (prev) => (prev ?? []).filter((x) => x.id !== id));
      setPickedId((prev) => (prev === id ? null : prev));
      return true;
    },
    [qc, queryKey, userId],
  );

  return {
    signedIn: Boolean(user),
    ready,
    cvs,
    selectedCv,
    selectedId,
    selectCv: setPickedId,
    addCv,
    removeCv,
  };
}

import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCvs } from "../../hooks/useCvs";
import { PreferencesProvider } from "../../providers/preferences/PreferencesProvider";
import { usePreferences } from "../../providers/preferences/usePreferences";
import { ProfileProvider } from "../../providers/profile/ProfileProvider";
import { useProfile } from "../../providers/profile/useProfile";
import { SavedJobsProvider } from "../../providers/savedJobs/SavedJobsProvider";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import { CV_PROFILE } from "../factories";
import { fakeSupabase } from "../fakeSupabase";

const auth = vi.hoisted(() => ({ user: null as { id: string } | null }));
vi.mock("../../providers/auth/useAuth", () => ({
  useAuth: () => ({ user: auth.user, enabled: true, ready: true }),
}));
vi.mock("../../services/supabase", async () => {
  const { fakeSupabase } = await import("../fakeSupabase");
  return { supabase: fakeSupabase, supabaseEnabled: true };
});

let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: qc },
    createElement(
      ProfileProvider,
      null,
      createElement(PreferencesProvider, null, createElement(SavedJobsProvider, null, children)),
    ),
  );
}

const JOB = { source: "melio", external_id: "e1", title: "Frontend", location: "TLV", url: null };

describe("signed-in persistence against Supabase (integration)", () => {
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    fakeSupabase.reset();
    auth.user = { id: "u1" };
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  describe("profile", () => {
    it("loads the stored profile for the user", async () => {
      fakeSupabase.seed("profiles", [{ user_id: "u1", data: CV_PROFILE }]);
      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.profile?.skills).toEqual(["React", "TypeScript"]);
    });

    it("falls back to the local copy when the request fails", async () => {
      localStorage.setItem("cvProfile.local.v1", JSON.stringify(CV_PROFILE));
      fakeSupabase.fail("profiles", "select");
      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.profile?.roles).toEqual(["frontend"]);
    });

    it("ignores a malformed remote profile", async () => {
      fakeSupabase.seed("profiles", [{ user_id: "u1", data: { skills: "React" } }]);
      const { result } = renderHook(() => useProfile(), { wrapper });

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.profile).toBeNull();
    });

    it("saves to the user's row (not localStorage) and can clear it", async () => {
      const { result } = renderHook(() => useProfile(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      act(() => result.current.saveProfile(CV_PROFILE));
      await waitFor(() =>
        expect(fakeSupabase.rows("profiles")).toEqual([expect.objectContaining({ user_id: "u1", data: expect.objectContaining({ skills: ["React", "TypeScript"] }) })]),
      );
      expect(localStorage.getItem("cvProfile.local.v1")).toBeNull();

      act(() => result.current.clearProfile());
      await waitFor(() => expect(fakeSupabase.rows("profiles")).toHaveLength(0));
      expect(result.current.profile).toBeNull();
    });
  });

  describe("preferences", () => {
    it("loads remote preferences and mirrors them locally", async () => {
      fakeSupabase.seed("profiles", [
        { user_id: "u1", preferences: { region: "tlv", kind: "agency", roles: ["backend"], categories: null } },
      ]);
      const { result } = renderHook(() => usePreferences(), { wrapper });

      await waitFor(() => expect(result.current.prefs.region).toBe("tlv"));
      expect(result.current.prefs.categories).toEqual([]);
      expect(JSON.parse(localStorage.getItem("jobPreferences.v1") ?? "{}").region).toBe("tlv");
    });

    it("keeps the profile data when saving preferences (same row, merged columns)", async () => {
      fakeSupabase.seed("profiles", [{ user_id: "u1", data: CV_PROFILE }]);
      const { result } = renderHook(() => usePreferences(), { wrapper });

      await act(async () => {
        await result.current.savePrefs({ region: "all", kind: "company", roles: ["frontend"], categories: [] });
      });

      expect(fakeSupabase.rows("profiles")).toEqual([
        expect.objectContaining({ user_id: "u1", data: CV_PROFILE, preferences: expect.objectContaining({ kind: "company" }) }),
      ]);
    });
  });

  describe("saved jobs", () => {
    it("loads, saves and removes rows for the user", async () => {
      fakeSupabase.seed("saved_jobs", [
        { user_id: "u1", source: "ness", external_id: "x", status: "saved", title: "Old" },
      ]);
      const { result } = renderHook(() => useSavedJobs(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.statusOf("ness", "x")).toBe("saved");

      await act(async () => {
        await result.current.setStatus(JOB, "applied", "Melio");
      });
      expect(fakeSupabase.rows("saved_jobs")).toEqual(
        expect.arrayContaining([expect.objectContaining({ source: "melio", external_id: "e1", status: "applied", company: "Melio" })]),
      );

      await act(async () => {
        await result.current.setStatus(JOB, null);
      });
      expect(fakeSupabase.rows("saved_jobs")).toHaveLength(1);
      await waitFor(() => expect(result.current.statusOf("melio", "e1")).toBeUndefined());
    });

    it("rolls the change back when the write is rejected", async () => {
      const { result } = renderHook(() => useSavedJobs(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      fakeSupabase.fail("saved_jobs", "upsert", "RLS violation");
      let ok = true;
      await act(async () => {
        ok = await result.current.setStatus(JOB, "saved");
      });

      expect(ok).toBe(false);
      await waitFor(() => expect(result.current.statusOf("melio", "e1")).toBeUndefined());
    });
  });

  describe("CV library", () => {
    const row = (id: string, user_id: string, created_at: string) => ({ id, user_id, name: id, text: "x".repeat(60), created_at });

    it("lists only the user's CVs, newest first, with the newest selected", async () => {
      fakeSupabase.seed("cvs", [
        row("old", "u1", "2026-01-01"),
        row("new", "u1", "2026-02-01"),
        row("other", "u2", "2026-03-01"),
      ]);
      const { result } = renderHook(() => useCvs(), { wrapper });

      await waitFor(() => expect(result.current.ready).toBe(true));
      expect(result.current.cvs.map((c) => c.id)).toEqual(["new", "old"]);
      expect(result.current.selectedCv?.id).toBe("new");
    });

    it("adds a CV, selects it, then removes it", async () => {
      const { result } = renderHook(() => useCvs(), { wrapper });
      await waitFor(() => expect(result.current.ready).toBe(true));

      let created: Awaited<ReturnType<typeof result.current.addCv>> = null;
      await act(async () => {
        created = await result.current.addCv("Resume", "y".repeat(60));
      });
      expect(created).toMatchObject({ name: "Resume" });
      expect(result.current.selectedCv?.name).toBe("Resume");
      expect(fakeSupabase.rows("cvs")).toHaveLength(1);

      let removed = false;
      await act(async () => {
        removed = await result.current.removeCv(created!.id);
      });
      expect(removed).toBe(true);
      expect(result.current.cvs).toHaveLength(0);
    });

    it("keeps the CV when the delete fails", async () => {
      fakeSupabase.seed("cvs", [row("a", "u1", "2026-01-01")]);
      const { result } = renderHook(() => useCvs(), { wrapper });
      await waitFor(() => expect(result.current.cvs).toHaveLength(1));

      fakeSupabase.fail("cvs", "delete");
      let removed = true;
      await act(async () => {
        removed = await result.current.removeCv("a");
      });

      expect(removed).toBe(false);
      expect(result.current.cvs).toHaveLength(1);
    });

    it("exposes nothing when signed out", async () => {
      auth.user = null;
      const { result } = renderHook(() => useCvs(), { wrapper });

      expect(result.current.signedIn).toBe(false);
      expect(result.current.cvs).toEqual([]);
      expect(result.current.ready).toBe(true);
    });
  });
});

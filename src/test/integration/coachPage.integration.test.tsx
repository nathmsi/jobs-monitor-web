import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "../../api/client";
import * as stream from "../../api/stream";
import { CoachPage } from "../../pages/CoachPage";
import { mockBackend } from "../apiMock";
import { fakeSupabase } from "../fakeSupabase";
import { renderWithProviders } from "../renderWithProviders";

const auth = vi.hoisted(() => ({
  value: null as unknown,
}));
vi.mock("../../providers/auth/useAuth", () => ({ useAuth: () => auth.value }));
vi.mock("../../services/supabase", async () => {
  const { fakeSupabase } = await import("../fakeSupabase");
  return { supabase: fakeSupabase, supabaseEnabled: true };
});

const signInWithGoogle = vi.fn();
const USER = { id: "u1", email: "dev@example.com", user_metadata: {} };
const CV_TEXT = "Senior frontend engineer. ".repeat(6) + "React TypeScript Node.js";

const ANALYSIS: client.CvAnalysis = {
  snapshot: { headline: "Senior frontend", current_level: "Senior", years_experience: 6, domains: ["web"], languages: ["en"] },
  target: { roles: ["Staff Engineer"], seniority: "Staff", years_to_target: "2", readiness_pct: 60 },
  strengths: [{ point: "React depth", evidence: "6 years" }],
  gaps: [{ gap: "System design", why_it_matters: "Staff scope", severity: "medium" }],
  cv_feedback: [],
  skills_to_learn: [],
  action_plan: { next_30_days: ["Ship a design doc"], next_90_days: [], next_6_months: [] },
  keywords_missing: [],
  overall: { score: 78, summary: "Solid senior profile, aim for staff." },
};

function signedIn() {
  auth.value = { user: USER, enabled: true, ready: true, signInWithGoogle, signOut: vi.fn() };
}
function signedOut() {
  auth.value = { user: null, enabled: true, ready: true, signInWithGoogle, signOut: vi.fn() };
}

describe("CoachPage (integration)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    fakeSupabase.reset();
    signInWithGoogle.mockReset();
    mockBackend({ jobs: [] });
  });

  describe("signed out", () => {
    it("asks to sign in instead of showing the tools", async () => {
      signedOut();
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });

      expect(screen.getByRole("heading", { name: "Unlock your career potential" })).toBeInTheDocument();
      expect(screen.queryByText("Analyze my CV")).not.toBeInTheDocument();

      // The header has one too: the call to action is the last one on the page.
      await user.click(screen.getAllByRole("button", { name: "Sign in with Google" }).at(-1)!);
      expect(signInWithGoogle).toHaveBeenCalledTimes(1);
    });
  });

  describe("signed in without a CV", () => {
    it("locks the features and invites you to upload a CV", async () => {
      signedIn();
      renderWithProviders(<CoachPage />, { route: "/coach" });

      expect(await screen.findByText("No CV uploaded yet")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Upload my CV (PDF)" })).toBeInTheDocument();
      expect(screen.getAllByText("Upload CV to unlock")).toHaveLength(2);
    });
  });

  describe("signed in with a CV", () => {
    beforeEach(() => {
      signedIn();
      fakeSupabase.seed("cvs", [
        { id: "cv-1", user_id: "u1", name: "My CV", text: CV_TEXT, created_at: "2026-01-02T00:00:00Z" },
        { id: "cv-2", user_id: "u2", name: "Someone else", text: CV_TEXT, created_at: "2026-01-03T00:00:00Z" },
      ]);
    });

    it("loads the user's newest CV only (RLS-style filtering)", async () => {
      renderWithProviders(<CoachPage />, { route: "/coach" });

      expect(await screen.findByText("My CV")).toBeInTheDocument();
      expect(screen.queryByText("Someone else")).not.toBeInTheDocument();
      expect(screen.getByText("Ready")).toBeInTheDocument();
    });

    it("runs the AI review with the CV, goal and language, and shows the result", async () => {
      const analyze = vi.spyOn(client, "analyzeCvAi").mockResolvedValue(ANALYSIS);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.type(screen.getByLabelText("Your goal (optional)"), "become staff");
      await user.click(screen.getByRole("button", { name: /Analyze my CV/ }));

      expect(await screen.findByText("Solid senior profile, aim for staff.")).toBeInTheDocument();
      expect(analyze).toHaveBeenCalledTimes(1);
      expect(analyze).toHaveBeenCalledWith(CV_TEXT.trim(), "become staff", "en", expect.any(AbortSignal));
    });

    it("shows the error and retries on demand", async () => {
      const analyze = vi
        .spyOn(client, "analyzeCvAi")
        .mockRejectedValueOnce(new Error("HTTP 502"))
        .mockResolvedValueOnce(ANALYSIS);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");
      await user.click(screen.getByRole("button", { name: /Analyze my CV/ }));

      expect(await screen.findByText("HTTP 502")).toBeInTheDocument();
      await user.click(screen.getByRole("button", { name: "Try again" }));

      expect(await screen.findByText("Solid senior profile, aim for staff.")).toBeInTheDocument();
      expect(analyze).toHaveBeenCalledTimes(2);
    });

    it("aborts the in-flight analysis when you go back", async () => {
      let signal: AbortSignal | undefined;
      vi.spyOn(client, "analyzeCvAi").mockImplementation(
        (_cv, _goal, _lang, s) =>
          new Promise((_resolve, reject) => {
            signal = s;
            s?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
          }),
      );
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");
      await user.click(screen.getByRole("button", { name: /Analyze my CV/ }));
      await waitFor(() => expect(signal).toBeDefined());

      await user.click(screen.getByRole("button", { name: "← Back" }));

      await waitFor(() => expect(signal?.aborted).toBe(true));
      expect(screen.getByRole("button", { name: /Find matching jobs/ })).toBeInTheDocument();
    });

    it("reuses a finished analysis instead of paying for it twice", async () => {
      const analyze = vi.spyOn(client, "analyzeCvAi").mockResolvedValue(ANALYSIS);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.click(screen.getByRole("button", { name: /Analyze my CV/ }));
      await screen.findByText("Solid senior profile, aim for staff.");
      await user.click(screen.getByRole("button", { name: "← Back" }));
      await user.click(screen.getByRole("button", { name: /Analyze my CV/ }));

      expect(await screen.findByText("Solid senior profile, aim for staff.")).toBeInTheDocument();
      expect(analyze).toHaveBeenCalledTimes(1);
    });

    it("matches offers with the selected filters and lists the results", async () => {
      const match = vi.spyOn(stream, "consumeMatchStream").mockResolvedValue([
        { id: "o1", title: "Staff Frontend", company: "Melio", url: null, score: 91, reasons: ["React"], weak_points: [] },
      ]);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.click(screen.getByRole("button", { name: /Find matching jobs/ }));
      await user.selectOptions(screen.getByLabelText("Area"), "tlv");
      await user.click(within(screen.getByRole("group", { name: "Source type" })).getByRole("button", { name: "Agencies" }));
      await user.click(screen.getByRole("button", { name: "Find my best offers" }));

      expect(await screen.findByText("Staff Frontend")).toBeInTheDocument();
      expect(match).toHaveBeenCalledWith(
        CV_TEXT.trim(),
        { region: "tlv", kind: "agency" },
        expect.any(Object),
        expect.any(AbortSignal),
      );
    });

    it("shows a stream error", async () => {
      vi.spyOn(stream, "consumeMatchStream").mockRejectedValue(new Error("Stream error"));
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.click(screen.getByRole("button", { name: /Find matching jobs/ }));
      await user.click(screen.getByRole("button", { name: "Find my best offers" }));

      expect(await screen.findByText("Stream error")).toBeInTheDocument();
    });
  });
});

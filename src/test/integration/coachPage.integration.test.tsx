import { act, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "../../api/client";
import * as stream from "../../api/stream";
import { CoachPage } from "../../pages/CoachPage";
import { mockBackend } from "../../../tests/support/mocks/apiMock";
import { fakeSupabase } from "../../../tests/support/mocks/fakeSupabase";
import { renderWithProviders } from "../../../tests/support/render/renderWithProviders";

const auth = vi.hoisted(() => ({
  value: null as unknown,
}));
vi.mock("../../providers/auth/useAuth", () => ({ useAuth: () => auth.value }));
vi.mock("../../services/supabase", async () => {
  const { fakeSupabase } = await import("../../../tests/support/mocks/fakeSupabase");
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

      expect(screen.getByRole("heading", { name: "Your career coach, powered by AI" })).toBeInTheDocument();
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

  describe("signed in with CVs that have no readable text (scanned PDFs)", () => {
    // What was found in production: the PDF had no text layer, so the saved rows are empty.
    const EMPTY_CVS = [
      { id: "e2", user_id: "u1", name: "CV Eytan Taieb", text: "", created_at: "2026-10-13T10:08:31Z" },
      { id: "e1", user_id: "u1", name: "CV Eytan Taieb", text: "", created_at: "2026-10-13T10:06:56Z" },
    ];

    it("says the saved CV is unreadable instead of pretending nothing was uploaded", async () => {
      signedIn();
      fakeSupabase.seed("cvs", EMPTY_CVS);
      renderWithProviders(<CoachPage />, { route: "/coach" });

      const notice = await screen.findByRole("alert");
      expect(notice).toHaveTextContent("“CV Eytan Taieb” has no readable text");
      expect(screen.queryByText("No CV uploaded yet")).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Upload my CV (PDF)" })).toBeInTheDocument();
      expect(screen.getAllByText("Upload CV to unlock")).toHaveLength(2); // nothing can run on empty text
    });

    it("flags the unreadable CVs in the picker", async () => {
      signedIn();
      fakeSupabase.seed("cvs", EMPTY_CVS);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });

      await user.click(await screen.findByRole("button", { name: "Upload my CV (PDF)" }));
      const options = within(screen.getByLabelText("Or select existing CV")).getAllByRole("option");
      expect(options.map((o) => o.textContent)).toEqual([
        "Choose a CV…",
        "CV Eytan Taieb (no readable text)",
        "CV Eytan Taieb (no readable text)",
      ]);
    });

    it("picks the newest CV that has text, even when a newer upload came out empty", async () => {
      signedIn();
      fakeSupabase.seed("cvs", [
        { id: "scan", user_id: "u1", name: "Scan", text: "", created_at: "2026-10-13T10:08:31Z" },
        { id: "good", user_id: "u1", name: "Good CV", text: CV_TEXT, created_at: "2026-10-12T09:00:00Z" },
      ]);
      renderWithProviders(<CoachPage />, { route: "/coach" });

      expect(await screen.findByText("Good CV")).toBeInTheDocument();
      expect(screen.getByText("Ready")).toBeInTheDocument();
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
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

    it("shows what the agent is searching while it works, then the ranked offers and what to check", async () => {
      let finish: (offers: client.MatchedOffer[] | null) => void = () => {};
      vi.spyOn(stream, "consumeMatchStream").mockImplementation((_cv, _filters, callbacks) => {
        callbacks.onToolCall?.("search_offers", { role: "Staff Frontend", skills: ["React"] }, "t0:1");
        return new Promise((resolve) => {
          finish = resolve;
        });
      });
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.click(screen.getByRole("button", { name: /Find matching jobs/ }));
      await user.click(screen.getByRole("button", { name: "Find my best offers" }));

      // Live progress: the step the agent is on, and the search it just started.
      expect(await screen.findByText("Searching Staff Frontend · React")).toBeInTheDocument();
      expect(within(screen.getByRole("region", { name: "AI Matching Agent" })).getByRole("status")).toHaveTextContent(
        "Step 2 of 4: Searching offers",
      );
      expect(screen.queryByRole("heading", { name: "Your best matches" })).not.toBeInTheDocument();

      await act(async () =>
        finish([
          { id: "o1", title: "Staff Frontend", company: "Melio", url: "https://x/1", score: 91, reasons: ["Uses React"], weak_points: ["No GraphQL"] },
        ]),
      );

      expect(await screen.findByRole("heading", { name: "Your best matches" })).toBeInTheDocument();
      expect(screen.getByText("Uses React")).toBeInTheDocument();
      expect(screen.getByText("No GraphQL")).toBeInTheDocument(); // the API's weak points are shown
      expect(screen.queryByText("Searching Staff Frontend · React")).not.toBeInTheDocument(); // progress is gone
    });

    it("says so when nothing matches, and lets you search again", async () => {
      vi.spyOn(stream, "consumeMatchStream").mockResolvedValue([]);
      const { user } = renderWithProviders(<CoachPage />, { route: "/coach" });
      await screen.findByText("My CV");

      await user.click(screen.getByRole("button", { name: /Find matching jobs/ }));
      await user.click(screen.getByRole("button", { name: "Find my best offers" }));

      expect(await screen.findByRole("heading", { name: "No strong match found" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Search again" })).toBeInTheDocument();
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

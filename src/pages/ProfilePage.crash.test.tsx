import { afterEach, describe, expect, it, vi, type Mock } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";

import { ProfilePage } from "./ProfilePage";
import type { JobPreferences } from "../lib/preferences";
import type { CvProfile } from "../lib/cvAnalysis";

// ── Stable mocks ─────────────────────────────────────────────────────────────

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: Record<string, unknown>) =>
      opts ? `${k}` : k,
    i18n: { language: "en" },
  }),
}));

vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to as string}>{children}</a>
  ),
}));

vi.mock("../api/hooks", () => ({
  useRegionJobs: () => ({ data: null }),
  useRegions: () => ({ data: [] }),
  useSources: () => ({ data: [] }),
}));

vi.mock("../lib/auth");
vi.mock("../lib/profile");
vi.mock("../lib/preferences");
vi.mock("../lib/cvs", () => ({
  useCvs: () => ({
    cvs: [],
    selectedCv: null,
    selectedId: null,
    selectCv: vi.fn(),
    addCv: vi.fn(),
  }),
}));
vi.mock("../lib/toast", () => ({ useToast: () => ({ showToast: vi.fn() }) }));
vi.mock("../lib/jobFlags", () => ({
  useJobFlags: () => ({ isOpened: () => false, markOpened: vi.fn() }),
  jobId: (s: string, e: string) => `${s}-${e}`,
}));
vi.mock("../lib/savedJobs", () => ({
  useSavedJobs: () => ({ statusOf: () => undefined, setStatus: vi.fn() }),
}));

// Stub heavy sub-components so they don't pull in their own hooks
vi.mock("../components/Header/Header", () => ({
  Header: () => <div data-testid="header" />,
}));
vi.mock("../components/ProfileEditor/ProfileEditor", () => ({
  ProfileEditor: () => <div data-testid="profile-editor" />,
}));
vi.mock("../components/CVUploadModal/CVUploadModal", () => ({
  CVUploadModal: () => null,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const DEFAULT_PREFS: JobPreferences = {
  region: "all",
  kind: "all",
  roles: [],
  categories: [],
};

const VALID_PROFILE: CvProfile = {
  skills: ["React", "TypeScript"],
  roles: ["frontend"],
  languages: ["English"],
  seniority: "Senior",
  years: 5,
  locations: ["Tel Aviv"],
  titles: ["Frontend Developer"],
  education: [],
  certifications: [],
};

async function setup(opts: {
  loggedIn?: boolean;
  prefs?: Partial<JobPreferences>;
  profile?: CvProfile | null;
}) {
  const { useAuth } = await import("../lib/auth");
  const { useProfile } = await import("../lib/profile");
  const { usePreferences } = await import("../lib/preferences");

  (useAuth as Mock).mockReturnValue(
    opts.loggedIn
      ? {
          user: { id: "u1", email: "test@test.com", user_metadata: {} },
          enabled: true,
          signInWithGoogle: vi.fn(),
          signOut: vi.fn(),
        }
      : { user: null, enabled: false, signInWithGoogle: vi.fn(), signOut: vi.fn() },
  );

  (useProfile as Mock).mockReturnValue({
    profile: opts.profile !== undefined ? opts.profile : null,
    ready: true,
    saveProfile: vi.fn(),
    clearProfile: vi.fn(),
  });

  (usePreferences as Mock).mockReturnValue({
    prefs: { ...DEFAULT_PREFS, ...opts.prefs },
    savePrefs: vi.fn(),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("ProfilePage — crash guards", () => {
  afterEach(cleanup);
  it("renders without crash when not logged in and no profile", async () => {
    await setup({ loggedIn: false, profile: null });
    expect(() => render(<ProfilePage />)).not.toThrow();
    expect(screen.getByTestId("header")).toBeTruthy();
  });

  it("renders without crash when not logged in with default prefs", async () => {
    await setup({ loggedIn: false, prefs: DEFAULT_PREFS, profile: null });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when prefs.roles is null (old localStorage format)", async () => {
    await setup({
      loggedIn: false,
      prefs: { roles: null as unknown as string[], categories: [] },
      profile: null,
    });
    // draftPrefs.roles.includes() would crash before the mergePrefs fix
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when prefs.categories is null", async () => {
    await setup({
      loggedIn: false,
      prefs: { roles: [], categories: null as unknown as string[] },
      profile: null,
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when both roles and categories are null", async () => {
    await setup({
      loggedIn: false,
      prefs: {
        roles: null as unknown as string[],
        categories: null as unknown as string[],
      },
      profile: null,
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when profile.skills is undefined (malformed stored data)", async () => {
    await setup({
      loggedIn: true,
      profile: { ...VALID_PROFILE, skills: undefined as unknown as string[] },
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when profile.roles is undefined", async () => {
    await setup({
      loggedIn: true,
      profile: { ...VALID_PROFILE, roles: undefined as unknown as string[] },
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash when profile is null but user is logged in", async () => {
    await setup({ loggedIn: true, profile: null });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("renders without crash with a fully valid profile and prefs", async () => {
    await setup({
      loggedIn: true,
      profile: VALID_PROFILE,
      prefs: { region: "il", kind: "company", roles: ["frontend"], categories: ["fintech"] },
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });

  it("shows the preferences section (role chips rendered)", async () => {
    await setup({ loggedIn: false, profile: null });
    render(<ProfilePage />);
    // ROLES constant renders chip buttons — at least one should appear
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0);
  });

  it("shows empty stats card when no profile", async () => {
    await setup({ loggedIn: false, profile: null });
    render(<ProfilePage />);
    expect(screen.getAllByText("profile.emptyStats").length).toBeGreaterThan(0);
  });

  it("does not show empty stats card when profile is valid", async () => {
    await setup({ loggedIn: true, profile: VALID_PROFILE });
    render(<ProfilePage />);
    expect(screen.queryByText("profile.emptyStats")).toBeNull();
  });

  it("renders sign-in button when not logged in and no CV", async () => {
    await setup({ loggedIn: false, profile: null });
    render(<ProfilePage />);
    // The sign-in button uses t("auth.signInGoogle") — may appear once or more
    expect(screen.getAllByText("auth.signInGoogle").length).toBeGreaterThan(0);
  });

  it("renders without crash when prefs region is undefined (very old format)", async () => {
    await setup({
      loggedIn: false,
      prefs: { region: undefined as unknown as string, kind: "all", roles: [], categories: [] },
      profile: null,
    });
    expect(() => render(<ProfilePage />)).not.toThrow();
  });
});

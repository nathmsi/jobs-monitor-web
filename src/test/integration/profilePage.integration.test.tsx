import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { ProfilePage } from "../../pages/ProfilePage";
import { mockBackend } from "../apiMock";
import { CV_PROFILE, makeJob } from "../factories";
import { renderWithProviders } from "../renderWithProviders";

const REACT_JOB = makeJob({ external_id: "r1", title: "Product Engineer", description: "React and TypeScript daily" });
const OTHER_JOB = makeJob({ external_id: "o1", title: "Accountant", description: "Excel" });

const group = (name: string) => screen.getByRole("group", { name });

describe("ProfilePage (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: [REACT_JOB, OTHER_JOB] });
    await i18n.changeLanguage("en");
  });

  it("starts with empty stats and no recommendations when there is no profile", async () => {
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    expect(await screen.findByText(/Analyze your CV to unlock your match stats/)).toBeInTheDocument();
    expect(screen.queryByText("Recommended for you")).not.toBeInTheDocument();
  });

  it("toggles preference chips and saves them to the device", async () => {
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });
    await screen.findByRole("heading", { name: "Job preferences" });

    await user.click(within(group("Roles")).getByRole("button", { name: "Frontend" }));
    await user.click(within(group("Source type")).getByRole("button", { name: "Agencies" }));
    await user.click(within(group("Sectors")).getByRole("button", { name: "Fintech" }));
    await user.selectOptions(screen.getByLabelText("Area"), "tlv");
    expect(within(group("Roles")).getByRole("button", { name: "Frontend" })).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "Save preferences" }));

    expect(await screen.findByText(/Preferences saved/)).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("jobPreferences.v1") ?? "{}")).toEqual({
      region: "tlv",
      kind: "agency",
      roles: ["frontend"],
      categories: ["fintech"],
    });
  });

  it("prefills the form from stored preferences, tolerating null lists", async () => {
    localStorage.setItem(
      "jobPreferences.v1",
      JSON.stringify({ region: "tlv", kind: "company", roles: null, categories: ["gaming"] }),
    );
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    await waitFor(() => expect(screen.getByLabelText("Area")).toHaveValue("tlv"));
    expect(within(group("Source type")).getByRole("button", { name: "Companies" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group("Sectors")).getByRole("button", { name: "Gaming" })).toHaveAttribute("aria-pressed", "true");
    expect(within(group("Roles")).queryAllByRole("button", { pressed: true })).toHaveLength(0);
  });

  it("shows match stats and recommends only matching offers when a profile exists", async () => {
    localStorage.setItem("cvProfile.local.v1", JSON.stringify(CV_PROFILE));
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    // Offers arrive after the profile card is shown.
    expect(await screen.findByText("Product Engineer")).toBeInTheDocument();
    expect(screen.getByText("Recommended for you")).toBeInTheDocument();
    expect(screen.getByText("Your most in-demand skills")).toBeInTheDocument();
    expect(screen.queryByText("Accountant")).not.toBeInTheDocument();
  });

  it("does not download the full offer set when there is no profile", async () => {
    vi.restoreAllMocks();
    const backend = mockBackend({ jobs: [REACT_JOB] });
    renderWithProviders(<ProfilePage />, { route: "/profile" });
    await screen.findByRole("heading", { name: "Job preferences" });

    expect(backend.getRegionJobs).not.toHaveBeenCalled();
  });

  it("applies and remembers the chosen theme", async () => {
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });
    await screen.findByRole("heading", { name: "Job preferences" });

    await user.click(screen.getByRole("radio", { name: "Dark" }));

    expect(document.documentElement).toHaveAttribute("data-theme", "dark");
    expect(localStorage.getItem("theme")).toBe("dark");

    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(document.documentElement).not.toHaveAttribute("data-theme");
  });

  it("labels regions in the active language", async () => {
    await i18n.changeLanguage("fr");
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    expect(await screen.findByRole("option", { name: "Tout Israël" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });
});

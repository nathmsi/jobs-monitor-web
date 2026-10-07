import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JobsPage } from "../../pages/JobsPage";
import { mockBackend } from "../apiMock";
import { CV_PROFILE, makeJob } from "../factories";
import { renderWithProviders } from "../renderWithProviders";

const FRONTEND = makeJob({ external_id: "1", title: "Frontend Engineer", excerpt: "React and TypeScript", is_hot: true });
const BACKEND = makeJob({ external_id: "2", title: "Backend Developer", excerpt: "Node.js" });
const AGENCY = makeJob({ external_id: "3", source: "ness", title: "Staffing Role", excerpt: "Consulting" });

const cards = () => screen.queryAllByRole("article");
const titles = () => cards().map((c) => within(c).getByRole("heading", { level: 3 }).textContent);

async function renderJobs(route = "/") {
  const utils = renderWithProviders(<JobsPage />, { route });
  await screen.findByText("Frontend Engineer");
  return utils;
}

describe("JobsPage (integration)", () => {
  let backend: ReturnType<typeof mockBackend>;

  beforeEach(() => {
    vi.restoreAllMocks();
    backend = mockBackend({ jobs: [FRONTEND, BACKEND, AGENCY] });
  });

  it("lists company offers by default and the agency offer under its tab", async () => {
    const { user } = await renderJobs();
    expect(titles()).toEqual(["Frontend Engineer", "Backend Developer"]);

    await user.click(screen.getByRole("tab", { name: "Staffing agencies" }));
    await screen.findByText("Staffing Role");
    expect(titles()).toEqual(["Staffing Role"]);
    expect(screen.getByTestId("location")).toHaveTextContent("tab=agency");
    expect(backend.getJobsPage).toHaveBeenLastCalledWith(expect.objectContaining({ kind: "agency" }));
  });

  it("debounces the search and sends it to the backend", async () => {
    const { user } = await renderJobs();
    backend.getJobsPage.mockClear();

    await user.type(screen.getByRole("textbox", { name: /search/i }), "node");

    await waitFor(() => expect(titles()).toEqual(["Backend Developer"]));
    const withQuery = backend.getJobsPage.mock.calls.filter(([q]) => q.q);
    expect(withQuery.map(([q]) => q.q)).toEqual(["node"]);
    expect(screen.getByTestId("location")).toHaveTextContent("q=node");
  });

  it("restores filters from the URL", async () => {
    renderWithProviders(<JobsPage />, { route: "/?tab=agency&q=staffing&sort=oldest" });
    await screen.findByText("Staffing Role");

    expect(screen.getByRole("tab", { name: "Staffing agencies" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox", { name: /search/i })).toHaveValue("staffing");
    expect(screen.getByRole("combobox", { name: "Sort" })).toHaveValue("oldest");
  });

  it("keeps a role filter and search when both change quickly (no stale overwrite)", async () => {
    const { user } = await renderJobs();

    await user.type(screen.getByRole("textbox", { name: /search/i }), "e");
    await user.click(screen.getByRole("button", { name: "Frontend", pressed: false }));

    await waitFor(() => {
      const location = screen.getByTestId("location").textContent ?? "";
      expect(location).toContain("role=frontend");
      expect(location).toContain("q=e");
    });
  });

  it("saves an offer: button state, toast, tab counter and localStorage", async () => {
    const { user } = await renderJobs();
    const card = cards()[1];

    await user.click(within(card).getByRole("button", { name: "Save" }));

    expect(within(card).getByRole("button", { name: "Saved" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Offer saved ★")).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: /My offers/ })).toHaveTextContent("1");
    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem("savedJobs.local.v1") ?? "[]")).toEqual([
        expect.objectContaining({ external_id: "2", status: "saved", title: "Backend Developer" }),
      ]),
    );
  });

  it("lists saved offers under 'My offers' and lets you remove them", async () => {
    const { user } = await renderJobs();
    await user.click(within(cards()[0]).getByRole("button", { name: "Save" }));

    await user.click(screen.getByRole("tab", { name: /My offers/ }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText("Frontend Engineer")).toBeInTheDocument();

    await user.click(within(panel).getByRole("button", { name: "Remove" }));
    expect(await within(panel).findByText("Nothing here yet. Save offers with ★.")).toBeInTheDocument();
  });

  it("hides offers you have already opened when asked to", async () => {
    const { user } = await renderJobs();
    // Opening = clicking the offer link (jsdom does not navigate).
    const link = within(cards()[1]).getByRole("link", { name: /view offer/i });
    link.addEventListener("click", (e) => e.preventDefault());
    await user.click(link);

    await user.click(screen.getByRole("checkbox", { name: /hide offers/i }));
    expect(titles()).toEqual(["Frontend Engineer"]);
    await user.click(screen.getByRole("checkbox", { name: /hide offers/i }));
    expect(titles()).toEqual(["Frontend Engineer", "Backend Developer"]);
  });

  it("paginates with 'Load more'", async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      makeJob({ external_id: `m${i}`, title: `Bulk ${String(i).padStart(2, "0")}` }),
    );
    vi.restoreAllMocks();
    mockBackend({ jobs: many });
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Bulk 00");

    expect(cards()).toHaveLength(24);
    expect(screen.getByText("Showing 24 of 30")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Load more" }));
    await waitFor(() => expect(cards()).toHaveLength(30));
    expect(screen.queryByRole("button", { name: "Load more" })).not.toBeInTheDocument();
  });

  it("shows the empty state and clears the search from it", async () => {
    const { user } = await renderJobs();
    await user.type(screen.getByRole("textbox", { name: /search/i }), "zzzz");

    expect(await screen.findByText("No offers for these filters.")).toBeInTheDocument();
    const emptyClear = screen.getAllByRole("button", { name: "Clear" }).at(-1)!;
    await user.click(emptyClear);

    await waitFor(() => expect(titles()).toEqual(["Frontend Engineer", "Backend Developer"]));
  });

  it("shows an alert when the backend fails", async () => {
    vi.restoreAllMocks();
    const failing = mockBackend({ jobs: [] });
    failing.getJobsPage.mockRejectedValue(new Error("HTTP 500 — Server Error"));
    renderWithProviders(<JobsPage />);

    expect(await screen.findByRole("alert")).toHaveTextContent("HTTP 500");
  });

  describe("'For me' tab", () => {
    it("asks for a profile when there is none", async () => {
      const { user } = await renderJobs();
      await user.click(screen.getByRole("tab", { name: "For me" }));

      expect(await screen.findByText("Analyze your CV to see the offers that match you.")).toBeInTheDocument();
    });

    it("ranks offers matching the stored profile", async () => {
      localStorage.setItem("cvProfile.local.v1", JSON.stringify(CV_PROFILE));
      const { user } = await renderJobs();

      await user.click(screen.getByRole("tab", { name: /For me/ }));
      expect(await screen.findByText(/offers matched to your profile/)).toBeInTheDocument();
      expect(titles()).toEqual(["Frontend Engineer"]);
    });

    it("shows an error with a retry when the full set cannot be loaded", async () => {
      localStorage.setItem("cvProfile.local.v1", JSON.stringify(CV_PROFILE));
      backend.getRegionJobs.mockRejectedValueOnce(new Error("HTTP 503"));
      const { user } = await renderJobs();

      await user.click(screen.getByRole("tab", { name: /For me/ }));
      const alert = await screen.findByRole("alert");
      expect(alert).toHaveTextContent("HTTP 503");

      await user.click(within(alert).getByRole("button", { name: "Try again" }));
      await waitFor(() => expect(titles()).toEqual(["Frontend Engineer"]));
    });
  });
});

describe("JobsPage search experience (integration)", () => {
  const IOS = makeJob({ external_id: "i1", title: "Senior iOS Developer", description: "Swift and UIKit" });
  const ANDROID = makeJob({ external_id: "a1", title: "Android Engineer", description: "Kotlin" });
  const REACT = makeJob({ external_id: "r1", title: "Frontend Engineer", description: "React and Angular" });
  const BACK = makeJob({ external_id: "b1", title: "Backend Developer", description: "Python and scenarios of radios" });
  let backend: ReturnType<typeof mockBackend>;

  beforeEach(() => {
    vi.restoreAllMocks();
    backend = mockBackend({ jobs: [IOS, ANDROID, REACT, BACK] });
  });

  const listTitles = () => screen.queryAllByRole("article").map((c) => within(c).getByRole("heading", { level: 3 }).textContent);

  it("shows how many offers match", async () => {
    renderWithProviders(<JobsPage />);
    expect(await screen.findByText("4 offers")).toBeInTheDocument();
  });

  it("'Mobile' finds iOS and Android offers, not words that merely contain 'ios'", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");

    await user.click(screen.getByRole("button", { name: "Mobile" }));

    await waitFor(() => expect(listTitles()).toEqual(["Senior iOS Developer", "Android Engineer"]));
    expect(backend.getJobsPage).toHaveBeenLastCalledWith(expect.objectContaining({ role: "mobile" }));
  });

  it("several roles can be combined", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");

    await user.click(screen.getByRole("button", { name: "Mobile" }));
    await user.click(screen.getByRole("button", { name: "Frontend" }));

    await waitFor(() => expect(listTitles()).toHaveLength(3));
    expect(backend.getJobsPage).toHaveBeenLastCalledWith(expect.objectContaining({ role: "mobile,frontend" }));
    expect(screen.getByTestId("location")).toHaveTextContent("role=mobile%2Cfrontend");
  });

  it("selected roles appear as chips with a result count and can be removed one by one", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");
    await user.click(screen.getByRole("button", { name: "Mobile" }));
    await user.click(screen.getByRole("button", { name: "Frontend" }));
    await screen.findByText("3 offers");

    const chips = screen.getByRole("list", { name: "Active filters" });
    expect(within(chips).getByText("Mobile")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Remove filter Mobile" }));

    await waitFor(() => expect(listTitles()).toEqual(["Frontend Engineer"]));
    expect(screen.getByText("1 offer")).toBeInTheDocument();
  });

  it("'Clear all' removes search and roles together", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");
    await user.click(screen.getByRole("button", { name: "Mobile" }));
    await user.type(screen.getByRole("textbox", { name: /search/i }), "ios");
    await screen.findByText("1 offer");

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    await waitFor(() => expect(listTitles()).toHaveLength(4));
    expect(screen.getByRole("textbox", { name: /search/i })).toHaveValue("");
  });

  it("sorts by relevance as soon as something is searched, by newest otherwise", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");
    const sort = screen.getByRole("combobox", { name: "Sort" });

    expect(sort).toHaveValue("recent");
    expect(within(sort).queryByRole("option", { name: "Best match" })).not.toBeInTheDocument();

    await user.type(screen.getByRole("textbox", { name: /search/i }), "developer");

    await waitFor(() => expect(sort).toHaveValue("relevance"));
    expect(backend.getJobsPage).toHaveBeenLastCalledWith(expect.objectContaining({ q: "developer", sort: "relevance" }));
  });

  it("an explicit sort wins over the relevance default", async () => {
    const { user } = renderWithProviders(<JobsPage />);
    await screen.findByText("Frontend Engineer");

    await user.selectOptions(screen.getByRole("combobox", { name: "Sort" }), "oldest");
    await user.type(screen.getByRole("textbox", { name: /search/i }), "developer");

    await waitFor(() =>
      expect(backend.getJobsPage).toHaveBeenLastCalledWith(expect.objectContaining({ q: "developer", sort: "oldest" })),
    );
  });

  it("applies every saved role preference, not just the first", async () => {
    localStorage.setItem(
      "jobPreferences.v1",
      JSON.stringify({ region: "all", kind: "all", roles: ["mobile", "frontend"], categories: [] }),
    );
    renderWithProviders(<JobsPage />);

    await waitFor(() => expect(listTitles()).toHaveLength(3));
    expect(screen.getByRole("button", { name: "Mobile" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Frontend" })).toHaveAttribute("aria-pressed", "true");
  });
});

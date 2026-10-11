import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../App";
import i18n from "../../i18n";
import { HomePage } from "../../pages/HomePage";
import { mockBackend } from "../apiMock";
import { CV_PROFILE, makeJob } from "../factories";
import { renderWithProviders } from "../renderWithProviders";

const JOBS = [
  makeJob({ external_id: "1", title: "Senior iOS Developer" }),
  makeJob({ external_id: "2", title: "Android Engineer" }),
];

describe("HomePage (integration)", () => {
  let backend: ReturnType<typeof mockBackend>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    backend = mockBackend({ jobs: JOBS });
    await i18n.changeLanguage("en");
  });

  it("leads with the search: heading and search box", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Find your next tech job in Israel");
    expect(screen.getByRole("combobox", { name: "Search offers" })).toBeInTheDocument();
  });

  it("popular searches come from the API, with their number of offers", async () => {
    renderWithProviders(<HomePage />);

    const popular = await screen.findByRole("navigation", { name: "Popular" });
    const links = await within(popular).findAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Mobile37", "Frontend65", "React16", "React Native5", "iOS9"]);
    expect(links[0]).toHaveAttribute("href", "/jobs?role=mobile");
    expect(links[2]).toHaveAttribute("href", "/jobs?q=React");
    expect(backend.getPopular).toHaveBeenCalledWith(8, expect.anything());
  });

  it("hides the popular searches when the API has none or fails", async () => {
    backend.getPopular.mockRejectedValue(new Error("HTTP 503"));
    renderWithProviders(<HomePage />);

    await screen.findByText("Senior iOS Developer");
    await waitFor(() => expect(screen.queryByRole("navigation", { name: "Popular" })).not.toBeInTheDocument());
  });

  it("shows the live numbers (formatted for the language) from the API", async () => {
    backend.getStats.mockResolvedValue({ total: 1234, new_this_week: 56, companies: 78, updated_at: null });
    renderWithProviders(<HomePage />);

    expect(await screen.findByText("1,234")).toBeInTheDocument();
    expect(screen.getByText("56")).toBeInTheDocument();
    expect(screen.getByText("live offers")).toBeInTheDocument();
  });

  it("hides the numbers when the stats request fails", async () => {
    backend.getStats.mockRejectedValue(new Error("HTTP 500"));
    renderWithProviders(<HomePage />);

    await screen.findByText("Senior iOS Developer");
    await waitFor(() => expect(screen.queryByRole("term")).not.toBeInTheDocument());
  });

  it("previews the latest six offers, newest first, with their companies", async () => {
    renderWithProviders(<HomePage />);

    expect(await screen.findByText("Senior iOS Developer")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(backend.getJobsPage).toHaveBeenCalledWith({ region: "all", sort: "recent", limit: 6 });
    expect(screen.getByRole("link", { name: "See all offers →" })).toHaveAttribute("href", "/jobs");
  });

  it("reserves space for the offers while they load", async () => {
    backend.getJobsPage.mockReturnValue(new Promise(() => {}));
    renderWithProviders(<HomePage />);

    const section = screen.getByRole("region", { name: "Latest offers" });
    expect(within(section).queryAllByRole("article")).toHaveLength(0);
    expect(section.querySelector("[aria-busy='true']")).not.toBeNull();
  });

  it("shows an error with a retry when the offers fail", async () => {
    backend.getJobsPage.mockRejectedValueOnce(new Error("HTTP 503"));
    const { user } = renderWithProviders(<HomePage />);

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load the latest offers.");

    await user.click(within(alert).getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Senior iOS Developer")).toBeInTheDocument();
  });

  it("searching navigates to the offers with the query (encoded and trimmed)", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.type(screen.getByRole("combobox", { name: "Search offers" }), "  c# & .net {enter}");

    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?q=c%23%20%26%20.net");
  });

  it("an empty search opens the offers without a query", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.click(screen.getByRole("button", { name: "Search" }));

    expect(screen.getByTestId("location")).toHaveTextContent(/^\/jobs$/);
  });

  it("invites you to add your CV (no account needed) and set preferences when there is no profile", () => {
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("link", { name: /Add your CV/ })).toHaveAttribute("href", "/profile");
    expect(screen.getByRole("link", { name: /Set your preferences/ })).toHaveAttribute("href", "/profile");
  });

  it("offers the personalised list when a profile exists", () => {
    localStorage.setItem("cvProfile.local.v1", JSON.stringify(CV_PROFILE));
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("link", { name: /Offers that match your profile/ })).toHaveAttribute("href", "/jobs?tab=forme");
    expect(screen.queryByRole("link", { name: /Add your CV/ })).not.toBeInTheDocument();
  });

  it("is translated", async () => {
    await i18n.changeLanguage("fr");
    renderWithProviders(<HomePage />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Trouvez votre prochain emploi tech en Israël");
    expect(screen.getByRole("button", { name: "Rechercher" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });

  it("the whole app lands on the home page and opens the browser on /jobs", async () => {
    const { user } = renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("heading", { level: 1, name: /Find your next tech job/ })).toBeInTheDocument();
    await user.click(within(screen.getByRole("navigation", { name: "Main navigation" })).getByRole("link", { name: "Offers" }));

    expect(await screen.findByRole("tablist", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs");
  }, 20_000);

  it("redirects old shared links (/?tab=…) to /jobs and keeps the parameters", async () => {
    renderWithProviders(<App />, { route: "/?tab=agency&q=staff" });

    expect(await screen.findByRole("tablist", {}, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?tab=agency&q=staff");
    expect(screen.getByRole("tab", { name: "Staffing agencies" })).toHaveAttribute("aria-selected", "true");
  }, 20_000);
});

import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../../../src/App";
import i18n from "../../../src/i18n";
import { mockBackend } from "../../support/mocks/apiMock";
import { makeJob } from "../../support/factories";
import { renderWithProviders } from "../../support/render/renderWithProviders";

describe("App routing and shell (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: [makeJob({ external_id: "1", title: "Frontend Engineer" })] });
    await i18n.changeLanguage("en");
  });

  it("navigates between the three pages from the header", async () => {
    const { user } = renderWithProviders(<App />, { route: "/" });
    await screen.findByText("Frontend Engineer");
    // Every page renders its own header, so look the navigation up again each time.
    const nav = () => screen.getByRole("navigation", { name: "Main navigation" });

    // Pages are lazy-loaded chunks: allow more than the default 1s.
    const lazy = { timeout: 5000 };
    await user.click(within(nav()).getByRole("link", { name: /CV Analysis/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "CV Coach" }, lazy)).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/coach");

    await user.click(within(nav()).getByRole("link", { name: "My Profile" }));
    expect(await screen.findByRole("heading", { level: 1, name: "My profile" }, lazy)).toBeInTheDocument();

    await user.click(within(nav()).getByRole("link", { name: "Offers" }));
    expect(await screen.findByText("Frontend Engineer")).toBeInTheDocument();
  }, 20_000);

  it("marks the current route in the navigation", async () => {
    renderWithProviders(<App />, { route: "/profile" });
    await screen.findByRole("heading", { level: 1, name: "My profile" }, { timeout: 5000 });

    const nav = screen.getByRole("navigation", { name: "Main navigation" });
    expect(within(nav).getByRole("link", { name: "My Profile" })).toHaveAttribute("aria-current", "page");
  });

  it("sets the document title per page", async () => {
    renderWithProviders(<App />, { route: "/coach" });
    await screen.findByRole("heading", { level: 1, name: "CV Coach" }, { timeout: 5000 });

    expect(document.title).toBe("CV Coach — Tech Jobs");
  });

  it("switches language and direction from the header", async () => {
    const { user } = renderWithProviders(<App />, { route: "/" });
    await screen.findByText("Frontend Engineer");

    await user.click(screen.getByRole("button", { name: "EN" }));
    await user.click(screen.getByRole("button", { name: "HE" }));

    await waitFor(() => expect(document.documentElement).toHaveAttribute("dir", "rtl"));
    expect(document.documentElement).toHaveAttribute("lang", "he");
    await i18n.changeLanguage("en");
    expect(document.documentElement).toHaveAttribute("dir", "ltr");
  });

  it("turns a synchronous fetch failure into an alert instead of a white screen", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { getJobsPage } = mockBackend({ jobs: [] });
    getJobsPage.mockImplementation(() => {
      throw new Error("kaboom");
    });
    renderWithProviders(<App />, { route: "/jobs" });

    // The query turns the thrown error into an alert rather than crashing the tree.
    expect(await screen.findByRole("alert", {}, { timeout: 5000 })).toHaveTextContent("kaboom");
  });
});

describe("Phone navigation (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: [makeJob({ external_id: "1", title: "Frontend Engineer" })] });
    await i18n.changeLanguage("en");
  });

  it("the bottom bar is part of every page and opens the AI coach and 'Saved'", async () => {
    const { user } = renderWithProviders(<App />, { route: "/" });
    const bar = () => screen.getByRole("navigation", { name: "Quick navigation" });

    await user.click(within(bar()).getByRole("link", { name: /CV Analysis/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "CV Coach" }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/coach");
    expect(within(bar()).getByRole("link", { name: /CV Analysis/ })).toHaveAttribute("aria-current", "page");

    await user.click(within(bar()).getByRole("link", { name: "Saved" }));
    expect(await screen.findByText("Nothing here yet. Save offers with ★.")).toBeInTheDocument();
  }, 20_000);

  it("counts saved offers in the bar", async () => {
    localStorage.setItem(
      "savedJobs.local.v1",
      JSON.stringify([{ source: "melio", external_id: "1", status: "saved", title: "Frontend Engineer" }]),
    );
    renderWithProviders(<App />, { route: "/" });

    expect(await screen.findByRole("link", { name: "Saved (1)" })).toBeInTheDocument();
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { HomePage } from "../../../src/pages/HomePage";
import { JobsPage } from "../../../src/pages/JobsPage";
import { mockBackend, SUGGESTIONS } from "../../support/mocks/apiMock";
import { makeJob } from "../../support/factories";
import { renderWithProviders } from "../../support/render/renderWithProviders";

const JOBS = [
  makeJob({ external_id: "1", title: "Senior iOS Developer" }),
  makeJob({ external_id: "2", title: "Frontend Engineer" }),
];

const box = (name: RegExp | string) => screen.getByRole("combobox", { name });
const optionNames = () => screen.queryAllByRole("option").map((o) => o.textContent);

describe("Autocomplete on the home page (integration)", () => {
  let backend: ReturnType<typeof mockBackend>;

  beforeEach(() => {
    vi.restoreAllMocks();
    backend = mockBackend({ jobs: JOBS });
  });

  it("suggests technologies while typing, with counts", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.type(box("Search offers"), "re");

    expect(await screen.findByRole("option", { name: /^React16$/ })).toBeInTheDocument();
    expect(optionNames()).toEqual(["React16", "React Native5"]);
    expect(backend.getSuggestions).toHaveBeenLastCalledWith("re", 8, expect.any(AbortSignal));
  });

  it("sends a single request for a burst of keystrokes (debounced)", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.type(box("Search offers"), "react");

    await screen.findByRole("option", { name: /^React16$/ });
    const asked = backend.getSuggestions.mock.calls.map((c) => c[0]);
    expect(asked.at(-1)).toBe("react");
    expect(asked.length).toBeLessThan(5);
  });

  it("picking a role opens the offers filtered on it", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.type(box("Search offers"), "mob");
    await user.click(await screen.findByRole("option", { name: /^Mobile37$/ }));

    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?role=mobile");
  });

  it("picking a technology (with the keyboard) searches for it", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.type(box("Search offers"), "react nat");
    await screen.findByRole("option", { name: /^React Native5$/ });
    await user.keyboard("{ArrowDown}{Enter}");

    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?q=React%20Native");
  });

  it("an empty box offers the popular searches from the API", async () => {
    const { user } = renderWithProviders(<HomePage />);

    await user.click(box("Search offers"));

    const popular = await screen.findByRole("group", { name: "Popular" });
    expect(within(popular).getAllByRole("option").length).toBeGreaterThan(0);
    expect(backend.getPopular).toHaveBeenCalled();
  });

  it("remembers what was searched and offers it next time", async () => {
    const first = renderWithProviders(<HomePage />);
    await first.user.type(box("Search offers"), "kotlin{Enter}");
    first.unmount();

    const { user } = renderWithProviders(<HomePage />);
    await user.click(box("Search offers"));

    expect(await screen.findByRole("group", { name: "Recent searches" })).toHaveTextContent("kotlin");
  });

  it("keeps working (plain search) when the suggestions service is down", async () => {
    backend.getSuggestions.mockRejectedValue(new Error("HTTP 503"));
    const { user } = renderWithProviders(<HomePage />);

    await user.type(box("Search offers"), "react{Enter}");

    expect(screen.queryByRole("option")).not.toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/jobs?q=react");
  });
});

describe("Autocomplete in the offers browser (integration)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mockBackend({ jobs: JOBS });
  });

  async function renderJobs() {
    const utils = renderWithProviders(<JobsPage />, { route: "/jobs" });
    await screen.findByText("Frontend Engineer");
    return utils;
  }

  it("picking a role adds it to the role filters and clears the typed text", async () => {
    const { user } = await renderJobs();

    await user.type(box(/search/i), "mob");
    await user.click(await screen.findByRole("option", { name: /^Mobile37$/ }));

    await waitFor(() => expect(screen.getByRole("button", { name: "Mobile", pressed: true })).toBeInTheDocument());
    expect(box(/search/i)).toHaveValue("");
    expect(screen.getByTestId("location")).toHaveTextContent("role=mobile");
  });

  it("picking several roles builds up the filter", async () => {
    const { user } = await renderJobs();

    await user.type(box(/search/i), "mob");
    await user.click(await screen.findByRole("option", { name: /^Mobile37$/ }));
    await user.type(box(/search/i), "front");
    await user.click(await screen.findByRole("option", { name: /^Frontend65$/ }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("role=mobile%2Cfrontend"));
  });

  it("picking a technology searches for it immediately (no debounce wait)", async () => {
    const { user } = await renderJobs();

    await user.type(box(/search/i), "rea");
    await user.click(await screen.findByRole("option", { name: /^React16$/ }));

    expect(box(/search/i)).toHaveValue("React");
    expect(screen.getByTestId("location")).toHaveTextContent("q=React");
  });

  it("the clear button resets the search", async () => {
    const { user } = await renderJobs();
    await user.type(box(/search/i), "react{Enter}");
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("q=react"));

    await user.click(within(screen.getByRole("search")).getByRole("button", { name: "Clear" }));

    expect(box(/search/i)).toHaveValue("");
    await waitFor(() => expect(screen.getByTestId("location")).not.toHaveTextContent("q="));
  });

  it("suggestions never list a kind that has none", async () => {
    const { user } = await renderJobs();

    await user.type(box(/search/i), "tel");

    expect(await screen.findByRole("group", { name: "Places" })).toHaveTextContent("Tel Aviv316");
    expect(screen.queryByRole("group", { name: "Roles" })).not.toBeInTheDocument();
    expect(SUGGESTIONS.length).toBeGreaterThan(0);
  });
});

import { screen, waitFor, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../../src/i18n";
import { JobPage } from "../../../src/pages/JobPage";
import { makeJob } from "../../support/factories";
import { mockBackend } from "../../support/mocks/apiMock";
import { renderWithProviders } from "../../support/render/renderWithProviders";

const OFFER = makeJob({
  source: "melio",
  external_id: "42",
  title: "Senior Backend Engineer",
  location: "Tel Aviv, Israel",
  excerpt: "Payments at scale",
  description: "About the role\nYou will build payment services with Node.js and PostgreSQL.",
  url: "https://careers.melio.example/42",
  is_hot: true,
});
const OTHERS = [1, 2, 3, 4].map((n) => makeJob({ source: "melio", external_id: `o${n}`, title: `Other offer ${n}` }));
const EXPIRED = makeJob({ source: "melio", external_id: "gone", title: "Closed Role", is_expired: true, url: "https://careers.melio.example/gone" });

function renderOffer(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/jobs/:source/:externalId/:slug?" element={<JobPage />} />
    </Routes>,
    { route: path },
  );
}

describe("JobPage (integration)", () => {
  let backend: ReturnType<typeof mockBackend>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    backend = mockBackend({ jobs: [OFFER, ...OTHERS, EXPIRED] });
    await i18n.changeLanguage("en");
  });

  it("shows the offer: its title, who posts it and the key facts", async () => {
    renderOffer("/jobs/melio/42/senior-backend-engineer");

    expect(await screen.findByRole("heading", { level: 1, name: "Senior Backend Engineer" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Melio" })).toHaveAttribute("href", "/companies/melio");
    expect(screen.getByText("Hot")).toBeInTheDocument();
    const facts = screen.getByRole("complementary", { name: "At a glance" });
    expect(within(facts).getByText("Tel Aviv, Israel")).toBeInTheDocument();
    expect(backend.getJob).toHaveBeenCalledWith("melio", "42");
  });

  it("applying goes to the company's site in a new tab", async () => {
    renderOffer("/jobs/melio/42/senior-backend-engineer");
    await screen.findByRole("heading", { level: 1 });

    const apply = screen.getAllByRole("link", { name: /^Apply/ })[0];
    expect(apply).toHaveAttribute("href", "https://careers.melio.example/42");
    expect(apply).toHaveAttribute("target", "_blank");
    expect(apply).toHaveAttribute("rel", expect.stringContaining("noreferrer"));
  });

  it("after the visitor goes to the company's site, it asks once whether they applied", async () => {
    const ui = renderOffer("/jobs/melio/42/senior-backend-engineer");
    await screen.findByRole("heading", { level: 1 });
    expect(screen.queryByTestId("did-you-apply")).not.toBeInTheDocument();

    // The click only has to be registered: the browser does not follow the link in jsdom.
    const apply = screen.getAllByRole("link", { name: /^Apply/ })[0];
    apply.addEventListener("click", (e) => e.preventDefault());
    await ui.user.click(apply);

    const ask = await screen.findByTestId("did-you-apply");
    await ui.user.click(within(ask).getByRole("button", { name: "Yes, I applied" }));

    expect(screen.queryByTestId("did-you-apply")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Applied", pressed: true })).toBeInTheDocument();
  });

  it("'Not yet' closes the question and marks nothing", async () => {
    const ui = renderOffer("/jobs/melio/42/senior-backend-engineer");
    await screen.findByRole("heading", { level: 1 });
    const apply = screen.getAllByRole("link", { name: /^Apply/ })[0];
    apply.addEventListener("click", (e) => e.preventDefault());
    await ui.user.click(apply);

    await ui.user.click(await screen.findByRole("button", { name: "Not yet" }));

    expect(screen.queryByTestId("did-you-apply")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "I applied", pressed: false })).toBeInTheDocument();
  });

  it("saving the offer toggles, and the choice is kept on this device", async () => {
    const ui = renderOffer("/jobs/melio/42/senior-backend-engineer");
    await screen.findByRole("heading", { level: 1 });

    const [save] = screen.getAllByRole("button", { name: "Save" });
    expect(save).toHaveAttribute("aria-pressed", "false");
    await ui.user.click(save);

    await waitFor(() => expect(screen.getAllByRole("button", { name: "Saved" })[0]).toHaveAttribute("aria-pressed", "true"));
    expect(localStorage.getItem("savedJobs.local.v1")).toContain("42");

    await ui.user.click(screen.getAllByRole("button", { name: "Saved" })[0]);
    await waitFor(() => expect(screen.getAllByRole("button", { name: "Save" })[0]).toHaveAttribute("aria-pressed", "false"));
  });

  it("'I applied' works without a bookmark, and can be undone", async () => {
    const ui = renderOffer("/jobs/melio/42/senior-backend-engineer");
    await screen.findByRole("heading", { level: 1 });

    await ui.user.click(screen.getByRole("button", { name: "I applied" }));
    await waitFor(() => expect(screen.getByRole("button", { name: "Applied", pressed: true })).toBeInTheDocument());

    await ui.user.click(screen.getByRole("button", { name: "Applied", pressed: true }));
    await waitFor(() => expect(screen.getByRole("button", { name: "I applied", pressed: false })).toBeInTheDocument());
  });

  it("lists a few other offers of the same company, with a link to all of them", async () => {
    renderOffer("/jobs/melio/42/senior-backend-engineer");

    const more = await screen.findByRole("heading", { name: "More from Melio" });
    const section = more.closest("section") as HTMLElement;
    expect(within(section).getAllByRole("article")).toHaveLength(3); // at most three, not the offer itself
    expect(within(section).queryByText("Senior Backend Engineer")).not.toBeInTheDocument();
    expect(within(section).getByRole("link", { name: "See all 5 offers" })).toHaveAttribute("href", "/companies/melio");
  });

  it("an offer that is closed says so, and offers no AI nudge", async () => {
    renderOffer("/jobs/melio/gone/closed-role");

    expect(await screen.findByText(/probably closed/)).toBeInTheDocument();
    expect(screen.getAllByText("Expired").length).toBeGreaterThan(0);
    expect(screen.queryByTestId("ai-nudge-job")).not.toBeInTheDocument();
    expect(backend.getCompany).not.toHaveBeenCalled(); // no "more from" for a closed offer
  });

  it("an offer that does not exist is a friendly 'not found' with a way out", async () => {
    renderOffer("/jobs/melio/nope/whatever");

    expect(await screen.findByText("We could not find this offer")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse offers" })).toHaveAttribute("href", "/jobs");
    expect(document.title).toContain("We could not find this offer");
  });

  it("any other failure is shown, and 'Try again' asks the API once more", async () => {
    // The hook already asks twice for an error that is not a 404; the page shows the failure after that.
    backend.getJob.mockRejectedValue(new Error("HTTP 503 — Service Unavailable"));
    const ui = renderOffer("/jobs/melio/42/senior-backend-engineer");

    expect(await screen.findByRole("alert", {}, { timeout: 8000 })).toHaveTextContent("503");
    const attempts = backend.getJob.mock.calls.length;

    backend.getJob.mockResolvedValue(OFFER);
    await ui.user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Senior Backend Engineer" })).toBeInTheDocument();
    expect(backend.getJob.mock.calls.length).toBeGreaterThan(attempts);
  });

  it("sets the page title and keeps an offer without a real description out of search engines", async () => {
    renderOffer("/jobs/melio/o1/other-offer-1");
    await screen.findByRole("heading", { level: 1, name: "Other offer 1" });

    expect(document.title).toContain("Other offer 1");
    expect(document.title).toContain("Melio");
    expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toContain("noindex");
  });
});

import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "../../../src/api/client";
import i18n from "../../../src/i18n";
import { CompanyPage } from "../../../src/pages/CompanyPage";
import { makeJob, makeSource, SOURCES } from "../../support/factories";
import { mockBackend } from "../../support/mocks/apiMock";
import { renderWithProviders } from "../../support/render/renderWithProviders";

const MELIO = makeSource({ key: "melio", label: "Melio", kind: "company", category: "fintech", site_url: "https://melio.example" });
const OFFERS = [1, 2].map((n) => makeJob({ source: "melio", external_id: `m${n}`, title: `Melio offer ${n}` }));

function renderCompany(key: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/companies/:key" element={<CompanyPage />} />
    </Routes>,
    { route: `/companies/${key}` },
  );
}

describe("CompanyPage (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: OFFERS, sources: [MELIO, ...SOURCES.filter((s) => s.key !== "melio")] });
    await i18n.changeLanguage("en");
  });

  it("shows the company, what kind it is, how many offers it has, and the offers", async () => {
    vi.spyOn(client, "getCompany").mockResolvedValue({
      source: MELIO,
      total: 2,
      jobs: OFFERS,
      top_skills: [{ skill: "React", count: 5 }, { skill: "Node.js", count: 3 }],
    });
    renderCompany("melio");

    expect(await screen.findByRole("heading", { level: 1, name: "Melio" })).toBeInTheDocument();
    expect(screen.getByText("Company · 2 open offers")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Company website" })).toHaveAttribute("href", "https://melio.example");
    expect(within(screen.getByRole("region", { name: "Most requested skills" })).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["React", "Node.js"]);
    expect(screen.getAllByRole("article")).toHaveLength(2);
    expect(document.title).toContain("Melio");
  });

  it("says so when the company has no open offer, with a way to browse", async () => {
    vi.spyOn(client, "getCompany").mockResolvedValue({ source: MELIO, total: 0, jobs: [], top_skills: [] });
    renderCompany("melio");

    expect(await screen.findByText("No open offers right now.")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: "Browse all offers" })[0]).toHaveAttribute("href", "/jobs");
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("a company that is not followed is a friendly 'not found'", async () => {
    renderCompany("nobody");
    expect(await screen.findByText("We could not find this company")).toBeInTheDocument();
  });

  it("a failure is shown with a way to try again", async () => {
    const getCompany = vi.spyOn(client, "getCompany").mockRejectedValue(new Error("HTTP 503 — Service Unavailable"));
    const ui = renderCompany("melio");

    expect(await screen.findByRole("alert", {}, { timeout: 8000 })).toHaveTextContent("503");
    getCompany.mockResolvedValue({ source: MELIO, total: 2, jobs: OFFERS, top_skills: [] });
    await ui.user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByRole("heading", { level: 1, name: "Melio" })).toBeInTheDocument();
  });
});

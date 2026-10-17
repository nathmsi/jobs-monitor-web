import { screen, within } from "@testing-library/react";
import { Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as client from "../../../src/api/client";
import i18n from "../../../src/i18n";
import { TopicPage } from "../../../src/pages/TopicPage";
import { makeJob } from "../../support/factories";
import { mockBackend } from "../../support/mocks/apiMock";
import { renderWithProviders } from "../../support/render/renderWithProviders";

const REACT = { slug: "react", label: "React", value: "React", type: "skill" as const };
const TLV = { key: "tlv", label_en: "Tel Aviv", label_he: "תל אביב", label_fr: "Tel Aviv" };
const JOBS = [1, 2, 3].map((n) => makeJob({ external_id: `r${n}`, title: `React job ${n}` }));

function renderTopic(path: string) {
  return renderWithProviders(
    <Routes>
      <Route path="/tech/:tech/:region?" element={<TopicPage />} />
    </Routes>,
    { route: path },
  );
}

describe("TopicPage (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    mockBackend({ jobs: JOBS });
    await i18n.changeLanguage("en");
  });

  it("lists the offers for a technology in a region, with the count and the other regions", async () => {
    vi.spyOn(client, "getTopic").mockResolvedValue({ tech: REACT, region: TLV, total: 3, jobs: JOBS });
    renderTopic("/tech/react/tlv");

    expect(await screen.findByRole("heading", { level: 1, name: "React jobs in Tel Aviv" })).toBeInTheDocument();
    expect(screen.getByText("3 open offers")).toBeInTheDocument();
    expect(screen.getAllByRole("article")).toHaveLength(3);

    const others = screen.getByRole("navigation", { name: "Other regions" });
    expect(within(others).getByRole("link", { name: "All Israel" })).toHaveAttribute("href", "/tech/react");
    expect(within(others).queryByRole("link", { name: "Tel Aviv" })).not.toBeInTheDocument(); // not the region we are in
  });

  it("without a region it is about all of Israel", async () => {
    vi.spyOn(client, "getTopic").mockResolvedValue({ tech: REACT, region: { key: "all", label_en: "All Israel", label_he: "כל ישראל", label_fr: "Tout Israël" }, total: 3, jobs: JOBS });
    renderTopic("/tech/react");

    expect(await screen.findByRole("heading", { level: 1, name: "React jobs in Israel" })).toBeInTheDocument();
    expect(document.title).toContain("React");
  });

  it("says so when there is no offer, with a way to browse", async () => {
    vi.spyOn(client, "getTopic").mockResolvedValue({ tech: REACT, region: TLV, total: 0, jobs: [] });
    renderTopic("/tech/react/tlv");

    expect(await screen.findByText("No offers right now.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Browse all offers" })).toHaveAttribute("href", "/jobs");
  });

  it("a technology or region that does not exist is a friendly 'not found'", async () => {
    vi.spyOn(client, "getTopic").mockRejectedValue(new Error("HTTP 404 — Not Found"));
    renderTopic("/tech/cobol/atlantis");
    expect(await screen.findByText("We could not find this page")).toBeInTheDocument();
  });
});

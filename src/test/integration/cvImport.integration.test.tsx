import { screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { ProfilePage } from "../../pages/ProfilePage";
import { mockBackend } from "../apiMock";
import { makeJob } from "../factories";
import { renderWithProviders } from "../renderWithProviders";

const pdf = vi.hoisted(() => ({ extractPdfText: vi.fn() }));
vi.mock("../../utils/pdf", () => pdf);

const CV =
  "Jane Doe, senior frontend developer. Six years building web apps with React, TypeScript and Redux. " +
  "Mobile apps in Swift for iOS. Node.js and PostgreSQL on the backend.";

const JOBS = [
  makeJob({ external_id: "1", title: "Product Engineer", description: "React and TypeScript every day" }),
  makeJob({ external_id: "2", title: "Accountant", description: "Excel and payroll" }),
];

const stored = () => JSON.parse(localStorage.getItem("cvProfile.local.v1") ?? "null");

describe("Add a CV without an account (integration)", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    pdf.extractPdfText.mockReset();
    mockBackend({ jobs: JOBS });
    await i18n.changeLanguage("en");
  });

  it("offers the import to a signed-out visitor, before anything else", async () => {
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    expect(await screen.findByRole("heading", { name: "Your CV" })).toBeInTheDocument();
    expect(screen.getByLabelText("Paste the text of your CV")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sign in with Google/ })).not.toBeInTheDocument();
  });

  it("pasting a CV creates the profile, fills the editor and unlocks the match stats", async () => {
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });

    await user.type(await screen.findByLabelText("Paste the text of your CV"), CV);
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));

    expect(await screen.findByText(/Profile ready: \d+ skills found/)).toBeInTheDocument();
    expect(stored().skills).toEqual(expect.arrayContaining(["React", "TypeScript", "Redux", "Swift"]));
    // The editor now shows the extracted skills (it used to stay empty)…
    expect(await screen.findByText("Redux")).toBeInTheDocument();
    expect(screen.queryByText("Add your CV above to extract your profile automatically.")).not.toBeInTheDocument();
    // …and the profile is used to recommend offers.
    expect(await screen.findByText("Recommended for you")).toBeInTheDocument();
    expect(await screen.findByText("Product Engineer")).toBeInTheDocument();
    expect(screen.queryByText("Accountant")).not.toBeInTheDocument();
  });

  it("never stores the CV text", async () => {
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });

    await user.type(await screen.findByLabelText("Paste the text of your CV"), CV);
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));
    await screen.findByText(/Profile ready/);

    const everything = JSON.stringify({ ...localStorage });
    expect(everything).not.toContain("Jane Doe");
    expect(everything).not.toContain("Six years");
  });

  it("reads a PDF in the browser and builds the profile from its text", async () => {
    pdf.extractPdfText.mockResolvedValue(CV);
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });
    await screen.findByLabelText("Paste the text of your CV");

    await user.upload(screen.getByTestId("cv-file-input"), new File(["%PDF"], "cv.pdf", { type: "application/pdf" }));

    expect(await screen.findByText(/Profile ready: \d+ skills found/)).toBeInTheDocument();
    expect(stored().roles).toEqual(expect.arrayContaining(["frontend", "mobile"]));
  });

  it("explains an unreadable PDF and keeps the form usable", async () => {
    pdf.extractPdfText.mockRejectedValue(new Error("corrupt"));
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });
    await screen.findByLabelText("Paste the text of your CV");

    await user.upload(screen.getByTestId("cv-file-input"), new File(["x"], "bad.pdf", { type: "application/pdf" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not read this PDF");
    expect(screen.getByLabelText("Paste the text of your CV")).toBeEnabled();
    expect(stored()).toBeNull();
  });

  it("refuses a CV that is too short or has no skill, and saves nothing", async () => {
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });
    const box = await screen.findByLabelText("Paste the text of your CV");

    await user.type(box, "React");
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("too short");

    await user.clear(box);
    await user.type(box, "I enjoy gardening, cooking and long walks in the countryside every weekend.");
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("could not find any technical skill");

    expect(stored()).toBeNull();
  });

  it("an existing profile is shown as done, and a new CV replaces it", async () => {
    localStorage.setItem(
      "cvProfile.local.v1",
      JSON.stringify({ skills: ["Python"], roles: ["backend"], languages: [], seniority: null, years: null, locations: [], titles: [], education: [], certifications: [] }),
    );
    const { user } = renderWithProviders(<ProfilePage />, { route: "/profile" });

    expect(await screen.findByText("Profile ready: 1 skill found")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Replace my CV" }));
    await user.type(screen.getByLabelText("Paste the text of your CV"), CV);
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));

    await waitFor(() => expect(stored().skills).toContain("React"));
    expect(stored().skills).not.toContain("Python");
    expect(within(screen.getByRole("heading", { name: "Your CV" }).parentElement!).getByText(/Profile ready: [2-9]/)).toBeInTheDocument();
  });

  it("is available in French", async () => {
    await i18n.changeLanguage("fr");
    renderWithProviders(<ProfilePage />, { route: "/profile" });

    expect(await screen.findByLabelText("Collez le texte de votre CV")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Analyser mon CV" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });
});

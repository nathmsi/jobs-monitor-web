import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import i18n from "../../i18n";
import type { MatchStep } from "../../hooks/useMatchRun";
import { AgentWorkflow } from "./AgentWorkflow";

const search = (id: string, role: string, status: MatchStep["status"] = "running", duration?: number): MatchStep => ({
  id,
  name: "search_offers",
  input: { role, skills: ["Node.js", "TypeScript"] },
  status,
  duration,
});

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"));
});

describe("AgentWorkflow", () => {
  it("shows the four stages and starts by reading the CV", () => {
    render(<AgentWorkflow steps={[]} />);

    const phases = within(screen.getByRole("list", { name: "Match progress" })).getAllByRole("listitem");
    expect(phases).toHaveLength(4);
    expect(phases[0]).toHaveAttribute("aria-current", "step");
    expect(within(phases[0]).getByText("Reading your CV")).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "What the agent is doing" })).not.toBeInTheDocument();
  });

  it("announces one atomic status message for the current stage", () => {
    render(<AgentWorkflow steps={[search("1", "Backend Engineer")]} />);
    const status = screen.getByRole("status");
    expect(status).toHaveAttribute("aria-atomic", "true");
    expect(status).toHaveTextContent("Step 2 of 4: Searching offers");
  });

  it("marks the section busy", () => {
    render(<AgentWorkflow steps={[]} />);
    expect(screen.getByRole("region", { name: "AI Matching Agent" })).toHaveAttribute("aria-busy", "true");
  });

  it("lists every search the agent runs, with its target and duration once done", () => {
    render(
      <AgentWorkflow
        steps={[search("1", "Backend Engineer", "done", 2800), search("2", "Staff Engineer"), { id: "3", name: "read_offer", input: {}, status: "failed", duration: 90 }]}
      />,
    );
    const list = screen.getByRole("list", { name: "What the agent is doing" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(3);
    expect(items[0]).toHaveTextContent("Searching Backend Engineer · Node.js, TypeScript");
    expect(items[0]).toHaveTextContent("2.8 s");
    expect(items[1]).toHaveTextContent("Searching Staff Engineer");
    expect(items[1]).not.toHaveTextContent(/ s$/);
    expect(items[2]).toHaveTextContent("Reading an offer in detail");
    expect(items[2]).toHaveTextContent("failed");
  });

  it("moves forward through the stages: done stages are not current", () => {
    render(
      <AgentWorkflow steps={[search("1", "A", "done", 100), { id: "2", name: "read_offer", input: { id: "x" }, status: "done", duration: 5 }]} />,
    );
    const phases = within(screen.getByRole("list", { name: "Match progress" })).getAllByRole("listitem");
    expect(phases.map((p) => p.getAttribute("aria-current"))).toEqual([null, null, null, "step"]);
    expect(screen.getByRole("status")).toHaveTextContent("Step 4 of 4: Ranking");
  });

  it("describes the no-agent pipeline's steps", () => {
    render(
      <AgentWorkflow
        steps={[
          { id: "search_offers", name: "search_offers", input: { skills: 9 }, status: "done", duration: 30 },
          { id: "read_offer", name: "read_offer", input: { offers: 40 }, status: "running" },
        ]}
      />,
    );
    expect(screen.getByText("Scoring every live offer against your 9 skills")).toBeInTheDocument();
    expect(screen.getByText("Ranking the 40 best candidates")).toBeInTheDocument();
  });

  it("tells the user how long to wait", () => {
    render(<AgentWorkflow steps={[]} />);
    expect(screen.getByText("This usually takes 15 to 30 seconds.")).toBeInTheDocument();
  });

  it("is translated in French and Hebrew", async () => {
    await act(() => i18n.changeLanguage("fr"));
    const { unmount } = render(<AgentWorkflow steps={[search("1", "Dev Backend")]} />);
    expect(screen.getByRole("status")).toHaveTextContent("Étape 2 sur 4 : Recherche d'offres");
    expect(screen.getByText("Recherche : Dev Backend · Node.js, TypeScript")).toBeInTheDocument();
    unmount();

    await act(() => i18n.changeLanguage("he"));
    render(<AgentWorkflow steps={[]} />);
    expect(screen.getByRole("status")).toHaveTextContent("שלב 1 מתוך 4");
  });
});

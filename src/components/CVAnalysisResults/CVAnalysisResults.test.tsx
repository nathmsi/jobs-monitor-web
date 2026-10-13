import { act, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { CvAnalysis } from "../../api/client";
import i18n from "../../i18n";
import { CVAnalysisResults } from "./CVAnalysisResults";
import { splitBeforeAfter } from "./splitBeforeAfter";

/** What an older API returns: none of the expert fields. */
const BASE: CvAnalysis = {
  snapshot: { headline: "Senior Backend Engineer", current_level: "Senior", years_experience: 7, domains: ["backend"], languages: ["English"] },
  target: { roles: ["Staff Engineer"], seniority: "Staff", years_to_target: "2y", readiness_pct: 55 },
  strengths: [{ point: "Led a migration", evidence: "Led migration to microservices" }],
  gaps: [{ gap: "No system design", why_it_matters: "Needed for Staff", severity: "high" }],
  cv_feedback: [],
  skills_to_learn: [],
  action_plan: { next_30_days: ["Write a design doc"], next_90_days: [], next_6_months: [] },
  keywords_missing: ["Kubernetes"],
  overall: { score: 72, summary: "Solid, needs proof of impact." },
};

const EXPERT: CvAnalysis = {
  ...BASE,
  source: "ai",
  first_impression: { recruiter_scan: "A keyword list with no proof of impact.", interview_decision: "maybe", reason: "Fixable in an hour." },
  scores: { impact: 30, clarity: 55, ats: 80, technical_depth: 90 },
  strengths: [{ point: "Led a migration", evidence: "Led migration to microservices", impact: "high" }],
  red_flags: [{ flag: "No metrics", why_it_hurts: "Impact is unclear", fix: "Add numbers" }],
  cv_feedback: [
    { issue: "Duties only", fix: "State outcomes", example: 'Before: "Worked on features" → After: "Shipped [N] features, cutting churn by [X%]"' },
    { issue: "Weak summary", fix: "Be specific", example: "Backend engineer, 7 years, Node and AWS." },
  ],
};

describe("splitBeforeAfter", () => {
  it("splits a Before → After rewrite and strips the quotes", () => {
    expect(splitBeforeAfter('Before: "Worked on bugs" → After: "Cut bug count by [X%]"')).toEqual({
      before: "Worked on bugs",
      after: "Cut bug count by [X%]",
    });
  });

  it("accepts a plain ASCII arrow and curly quotes", () => {
    expect(splitBeforeAfter("Before: “a” -> After: “b”")).toEqual({ before: "a", after: "b" });
  });

  it("returns null for free text", () => {
    expect(splitBeforeAfter("Just a tip")).toBeNull();
    expect(splitBeforeAfter("")).toBeNull();
  });
});

describe("CVAnalysisResults", () => {
  afterEach(async () => {
    await act(() => i18n.changeLanguage("en"));
  });

  it("shows the recruiter verdict, the score breakdown and the red flags", () => {
    render(<CVAnalysisResults analysis={EXPERT} />);

    expect(screen.getByRole("heading", { name: "The recruiter's verdict" })).toBeInTheDocument();
    expect(screen.getByText("Maybe — depends on a few fixes")).toBeInTheDocument();
    expect(screen.getByText("A keyword list with no proof of impact.")).toBeInTheDocument();

    const impact = screen.getByRole("meter", { name: "Impact" });
    expect(impact).toHaveAttribute("aria-valuenow", "30");
    expect(screen.getByRole("meter", { name: "Technical depth" })).toHaveAttribute("aria-valuenow", "90");

    expect(screen.getByRole("heading", { name: "What works" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "What hurts your chances" })).toBeInTheDocument();
    expect(screen.getByText("No metrics")).toBeInTheDocument();
    expect(screen.getByText("High impact")).toBeInTheDocument();
  });

  it("lists red flags and gaps together under what hurts", () => {
    render(<CVAnalysisResults analysis={EXPERT} />);
    const hurts = screen.getByRole("heading", { name: "What hurts your chances" }).closest("section")!;
    expect(within(hurts).getByText("No metrics")).toBeInTheDocument();
    expect(within(hurts).getByText("No system design")).toBeInTheDocument();
    expect(within(hurts).getByText("High")).toBeInTheDocument();
  });

  it("renders rewrites as Before / After and keeps free-text examples", () => {
    render(<CVAnalysisResults analysis={EXPERT} />);
    expect(screen.getByText("Worked on features")).toBeInTheDocument();
    expect(screen.getByText("Shipped [N] features, cutting churn by [X%]")).toBeInTheDocument();
    expect(screen.getByText("Before")).toBeInTheDocument();
    expect(screen.getByText("After")).toBeInTheDocument();
    expect(screen.getByText("Backend engineer, 7 years, Node and AWS.")).toBeInTheDocument();
  });

  it("does not show the fallback notice for an AI analysis", () => {
    render(<CVAnalysisResults analysis={EXPERT} />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("warns when the analysis is the basic fallback", () => {
    render(<CVAnalysisResults analysis={{ ...BASE, source: "heuristic" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Basic analysis");
  });

  it("still renders an older response without the expert fields", () => {
    render(<CVAnalysisResults analysis={BASE} />);

    expect(screen.getByText("Solid, needs proof of impact.")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "The recruiter's verdict" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter", { name: "Impact" })).not.toBeInTheDocument();
    expect(screen.getByText("No system design")).toBeInTheDocument();
    expect(screen.getByText("Kubernetes")).toBeInTheDocument();
  });

  it("is fully translated in French", async () => {
    await act(() => i18n.changeLanguage("fr"));
    render(<CVAnalysisResults analysis={EXPERT} />);

    expect(screen.getByRole("heading", { name: "Le verdict du recruteur" })).toBeInTheDocument();
    expect(screen.getByText("Peut-être — selon quelques corrections")).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "Profondeur technique" })).toBeInTheDocument();
    expect(screen.getByText("Avant")).toBeInTheDocument();
    expect(screen.queryByText("Overall score")).not.toBeInTheDocument();
  });

  it("is fully translated in Hebrew", async () => {
    await act(() => i18n.changeLanguage("he"));
    render(<CVAnalysisResults analysis={EXPERT} />);

    expect(screen.getByRole("heading", { name: "פסק הדין של המגייס" })).toBeInTheDocument();
    expect(screen.getByRole("meter", { name: "עומק טכני" })).toBeInTheDocument();
    expect(screen.getByText("לפני")).toBeInTheDocument();
  });

  it("has the same translation keys in every language", () => {
    const keys = (lang: string) => {
      const out: string[] = [];
      const walk = (o: unknown, path: string) => {
        if (o && typeof o === "object" && !Array.isArray(o)) Object.entries(o).forEach(([k, v]) => walk(v, `${path}.${k}`));
        else out.push(path);
      };
      walk(i18n.getResourceBundle(lang, "translation").coach.analysis, "analysis");
      return out.sort();
    };
    expect(keys("fr")).toEqual(keys("en"));
    expect(keys("he")).toEqual(keys("en"));
  });
});

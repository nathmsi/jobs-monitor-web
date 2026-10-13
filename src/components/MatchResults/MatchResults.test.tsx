import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MatchedOffer } from "../../api/client";
import i18n from "../../i18n";
import { MatchResults } from "./MatchResults";
import { scoreBand } from "./matchBands";

const offer = (n: number, score: number, over: Partial<MatchedOffer> = {}): MatchedOffer => ({
  id: `acme__${n}`,
  title: `Backend Engineer ${n}`,
  company: "Acme",
  url: `https://jobs.example/${n}`,
  score,
  reasons: [`Uses Node.js ${n}`, "Senior level fits"],
  weak_points: [`Little Kafka ${n}`],
  ...over,
});

const OFFERS = [offer(1, 92), offer(2, 80), offer(3, 66), offer(4, 51), offer(5, 40)];

afterEach(async () => {
  await act(() => i18n.changeLanguage("en"));
});

describe("scoreBand", () => {
  it.each([
    [100, "strong"], [75, "strong"], [74, "good"], [55, "good"], [54, "stretch"], [0, "stretch"],
  ])("%i → %s", (score, band) => {
    expect(scoreBand(score)).toBe(band);
  });
});

describe("MatchResults", () => {
  it("lists the offers in rank order with company, reasons and a link that opens safely", () => {
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(5);
    expect(within(cards[0]).getByRole("heading", { name: /Backend Engineer 1/ })).toBeInTheDocument();
    expect(within(cards[0]).getByText("Uses Node.js 1")).toBeInTheDocument();
    expect(within(cards[0]).getByText("Acme")).toBeInTheDocument();

    const links = within(cards[0]).getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "https://jobs.example/1");
      expect(link).toHaveAttribute("target", "_blank");
      expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(within(cards[0]).getAllByText("(opens in a new tab)").length).toBeGreaterThan(0);
  });

  it("highlights the best match and names the others by rank", () => {
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    const cards = screen.getAllByRole("article");
    expect(within(cards[0]).getByText("Best match")).toBeInTheDocument();
    expect(within(cards[1]).getByText("Match #2")).toBeInTheDocument();
  });

  it("shows the score as text a screen reader can use, and its level", () => {
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    const [first, , third, , fifth] = screen.getAllByRole("article");
    expect(within(first).getByText("92 percent match")).toBeInTheDocument();
    expect(within(first).getByText("Strong match", { selector: "span[class*=bandTag]" })).toBeInTheDocument();
    expect(within(third).getByText("Good fit", { selector: "span[class*=bandTag]" })).toBeInTheDocument();
    expect(within(fifth).getByText("Stretch", { selector: "span[class*=bandTag]" })).toBeInTheDocument();
  });

  it("shows the weak points the API returns, the best match's open by default", () => {
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    const [first, second] = screen.getAllByRole("article");

    const open = first.querySelector("details");
    const closed = second.querySelector("details");
    expect(open).toHaveProperty("open", true);
    expect(closed).toHaveProperty("open", false);
    expect(within(first).getByText("Little Kafka 1")).toBeInTheDocument();
    expect(within(second).getByText("What to check")).toBeInTheDocument();
  });

  it("omits the sections an offer has nothing for, and the links without a url", () => {
    render(<MatchResults offers={[offer(1, 90, { url: null, reasons: [], weak_points: [] })]} onAdapt={vi.fn()} />);
    const card = screen.getByRole("article");
    expect(within(card).queryByRole("link")).not.toBeInTheDocument();
    expect(within(card).queryByText("Why it fits")).not.toBeInTheDocument();
    expect(within(card).queryByText("What to check")).not.toBeInTheDocument();
    expect(within(card).getByRole("heading", { name: /Backend Engineer 1/ })).toBeInTheDocument();
  });

  it("summarises the matches: best, average and strong count", () => {
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    const stats = screen.getByText("Best match", { selector: "dt" }).closest("dl")!;
    expect(within(stats).getByText("92%")).toBeInTheDocument(); // best
    expect(within(stats).getByText("66%")).toBeInTheDocument(); // (92+80+66+51+40)/5 = 65.8
    expect(within(stats).getByText("2")).toBeInTheDocument(); // 92 and 80 are strong
    expect(screen.getByText("5 offers ranked for your profile")).toBeInTheDocument();
  });

  it("filters by match level, keeping the original ranks and the counts", async () => {
    const user = userEvent.setup();
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    const group = screen.getByRole("group", { name: "Filter by match level" });

    expect(within(group).getByRole("button", { name: /All\s*5/ })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(group).getByRole("button", { name: /Good fit\s*1/ }));

    const cards = screen.getAllByRole("article");
    expect(cards).toHaveLength(1);
    expect(within(cards[0]).getByRole("heading", { name: /Backend Engineer 3/ })).toBeInTheDocument();
    expect(within(cards[0]).getByText("Match #3")).toBeInTheDocument(); // rank kept
    expect(within(group).getByRole("button", { name: /Good fit/ })).toHaveAttribute("aria-pressed", "true");

    await user.click(within(group).getByRole("button", { name: /All/ }));
    expect(screen.getAllByRole("article")).toHaveLength(5);
  });

  it("disables a level that has no offer", () => {
    render(<MatchResults offers={[offer(1, 95), offer(2, 90)]} onAdapt={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Stretch\s*0/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Strong match\s*2/ })).toBeEnabled();
  });

  it("offers a single way back to the CV coach", async () => {
    const onAdapt = vi.fn();
    const user = userEvent.setup();
    render(<MatchResults offers={OFFERS} onAdapt={onAdapt} />);

    await user.click(screen.getByRole("button", { name: "Improve my CV" }));
    expect(onAdapt).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Adapt/ })).not.toBeInTheDocument();
  });

  it("uses the singular for one offer", () => {
    render(<MatchResults offers={[offer(1, 80)]} onAdapt={vi.fn()} />);
    expect(screen.getByText("1 offer ranked for your profile")).toBeInTheDocument();
  });

  it("explains an empty result without crashing", () => {
    render(<MatchResults offers={[]} onAdapt={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "No strong match found" })).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("is translated in French and Hebrew", async () => {
    await act(() => i18n.changeLanguage("fr"));
    const { unmount } = render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Vos meilleures offres" })).toBeInTheDocument();
    expect(screen.getByText("5 offres classées pour votre profil")).toBeInTheDocument();
    expect(screen.getAllByText("Match fort").length).toBeGreaterThan(0);
    unmount();

    await act(() => i18n.changeLanguage("he"));
    render(<MatchResults offers={OFFERS} onAdapt={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "ההתאמות הטובות ביותר שלך" })).toBeInTheDocument();
  });

  it("has the same translation keys in every language", () => {
    const keys = (lang: string) => {
      const out: string[] = [];
      const walk = (o: unknown, path: string) => {
        if (o && typeof o === "object") Object.entries(o).forEach(([k, v]) => walk(v, `${path}.${k.replace(/_(one|two|few|many|other)$/, "")}`));
        else out.push(path);
      };
      const bundle = i18n.getResourceBundle(lang, "translation");
      walk(bundle.match, "match");
      return [...new Set(out)].sort();
    };
    expect(keys("fr")).toEqual(keys("en"));
    expect(keys("he")).toEqual(keys("en"));
  });
});

import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../../i18n";
import { makeJob, makeSource } from "../../test/factories";
import { JobCard } from "./JobCard";

const flags = vi.hoisted(() => ({ opened: new Set<string>(), markOpened: vi.fn() }));
const saved = vi.hoisted(() => ({
  status: undefined as "saved" | "applied" | undefined,
  setStatus: vi.fn(async () => true),
}));
const toast = vi.hoisted(() => ({ showToast: vi.fn() }));
const profile = vi.hoisted(() => ({ value: null as unknown }));

vi.mock("../../providers/jobFlags/useJobFlags", () => ({
  useJobFlags: () => ({ isOpened: (id: string) => flags.opened.has(id), markOpened: flags.markOpened }),
}));
vi.mock("../../providers/savedJobs/useSavedJobs", () => ({
  useSavedJobs: () => ({ statusOf: () => saved.status, setStatus: saved.setStatus }),
}));
vi.mock("../../providers/toast/useToast", () => ({ useToast: () => toast }));
vi.mock("../../providers/profile/useProfile", () => ({ useProfile: () => ({ profile: profile.value }) }));

const SOURCE = makeSource({ key: "melio", label: "Melio" });
const JOB = makeJob({ external_id: "1", title: "Frontend Engineer", excerpt: "Build things", location: "Tel Aviv, Israel" });
const AI = JSON.stringify({
  headline: "Platform work",
  stack: ["Go", "Kubernetes", "Postgres", "Redis", "Kafka"],
  level: "Senior",
  remote: "Hybrid",
  highlights: ["Equity", "Gym"],
});

beforeEach(() => {
  flags.opened.clear();
  flags.markOpened.mockReset();
  saved.status = undefined;
  saved.setStatus.mockReset().mockResolvedValue(true);
  toast.showToast.mockReset();
  profile.value = null;
});

const renderCard = (job = JOB) => render(<JobCard job={job} source={SOURCE} />);

describe("JobCard", () => {
  it("shows the company, title, summary and first part of the location", () => {
    renderCard();
    expect(screen.getByText("Melio")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Frontend Engineer" })).toHaveAttribute("href", "https://example.com/job/1");
    expect(screen.getByText("Build things")).toBeInTheDocument();
    expect(screen.getByText("Tel Aviv")).toBeInTheDocument();
  });

  it("keeps the card light: AI headline instead of the excerpt, 3 technologies, no highlights", () => {
    renderCard(makeJob({ external_id: "2", title: "Platform Engineer", excerpt: "Long excerpt", ai_summary: AI }));

    expect(screen.getByText("Platform work")).toBeInTheDocument();
    expect(screen.queryByText("Long excerpt")).not.toBeInTheDocument();
    expect(screen.getByText("Go")).toBeInTheDocument();
    expect(screen.getByText("Postgres")).toBeInTheDocument();
    expect(screen.queryByText("Redis")).not.toBeInTheDocument();
    expect(screen.queryByText("Equity")).not.toBeInTheDocument();
    expect(screen.getByText("Senior")).toBeInTheDocument();
    expect(screen.getByText("Hybrid")).toBeInTheDocument();
  });

  it("has only two actions on an unsaved offer: open it and bookmark it", () => {
    renderCard();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName("Save");
    expect(screen.getByRole("link", { name: /view offer/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "I applied" })).not.toBeInTheDocument();
  });

  it("saving toasts and calls setStatus", async () => {
    const user = userEvent.setup();
    renderCard();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(saved.setStatus).toHaveBeenCalledWith(JOB, "saved", "Melio");
    expect(toast.showToast).toHaveBeenCalledWith("Offer saved ★");
  });

  it("shows the error toast and no success toast when saving fails", async () => {
    const user = userEvent.setup();
    saved.setStatus.mockResolvedValue(false);
    renderCard();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(toast.showToast).toHaveBeenCalledTimes(1);
    expect(toast.showToast).toHaveBeenCalledWith("Could not save your change. Please try again.");
  });

  it("a saved offer can be unsaved and offers 'I applied'", async () => {
    const user = userEvent.setup();
    saved.status = "saved";
    renderCard();

    const bookmark = screen.getByRole("button", { name: "Saved" });
    expect(bookmark).toHaveAttribute("aria-pressed", "true");

    await user.click(screen.getByRole("button", { name: "I applied" }));
    expect(saved.setStatus).toHaveBeenLastCalledWith(JOB, "applied", "Melio");
    expect(toast.showToast).toHaveBeenCalledWith("Marked as applied ✓");

    await user.click(bookmark);
    expect(saved.setStatus).toHaveBeenLastCalledWith(JOB, null, "Melio");
  });

  it("an applied offer shows the badge and can go back to saved", async () => {
    const user = userEvent.setup();
    saved.status = "applied";
    renderCard();

    expect(screen.getByTestId("badge-applied")).toBeInTheDocument();
    await user.click(within(screen.getByRole("contentinfo")).getByRole("button", { name: "Applied" }));
    expect(saved.setStatus).toHaveBeenLastCalledWith(JOB, "saved", "Melio");
  });

  it("opening the offer marks it as seen", async () => {
    const user = userEvent.setup();
    renderCard();
    const link = screen.getByRole("link", { name: /view offer/i });
    link.addEventListener("click", (e) => e.preventDefault());

    await user.click(link);

    expect(flags.markOpened).toHaveBeenCalledWith("melio-1");
  });

  it("flags new, hot and expired offers (new is hidden once seen)", () => {
    const { unmount } = renderCard(makeJob({ external_id: "3", title: "T", is_new: true, is_hot: true }));
    expect(screen.getByTestId("badge-new")).toBeInTheDocument();
    expect(screen.getByTestId("badge-hot")).toBeInTheDocument();
    unmount();

    flags.opened.add("melio-3");
    renderCard(makeJob({ external_id: "3", title: "T", is_new: true }));
    expect(screen.queryByTestId("badge-new")).not.toBeInTheDocument();
    expect(screen.getByTitle("Seen")).toBeInTheDocument();
  });

  it("marks expired offers", () => {
    renderCard(makeJob({ external_id: "4", title: "Old", is_expired: true }));
    expect(screen.getByTestId("badge-expired")).toBeInTheDocument();
  });

  it("shows how many of your skills match", () => {
    profile.value = {
      skills: ["React"], roles: [], languages: [], seniority: null, years: null,
      locations: [], titles: [], education: [], certifications: [],
    };
    renderCard(makeJob({ external_id: "5", title: "React Developer" }));
    expect(screen.getByText(/1 skill match/)).toBeInTheDocument();
  });

  it("has no link or tags section when there is nothing to show", () => {
    renderCard(makeJob({ external_id: "6", title: "Bare", url: null, location: "" }));
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });
});

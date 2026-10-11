import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../../i18n";
import { BottomNav } from "./BottomNav";

const saved = vi.hoisted(() => ({ items: [] as unknown[] }));
vi.mock("../../providers/savedJobs/useSavedJobs", () => ({ useSavedJobs: () => ({ items: saved.items }) }));

const renderAt = (route: string) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <BottomNav />
    </MemoryRouter>,
  );

const current = () => screen.queryAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");

describe("BottomNav", () => {
  beforeEach(() => {
    saved.items = [];
  });

  it("links the five main places", () => {
    renderAt("/");

    const nav = screen.getByRole("navigation", { name: "Quick navigation" });
    expect(Array.from(nav.querySelectorAll("a")).map((a) => [a.textContent, a.getAttribute("href")])).toEqual([
      ["Home", "/"],
      ["Offers", "/jobs"],
      ["For you", "/jobs?tab=forme"],
      ["Saved", "/jobs?tab=mine"],
      ["My Profile", "/profile"],
    ]);
  });

  it.each([
    ["/", "Home"],
    ["/jobs", "Offers"],
    ["/jobs?q=react&role=mobile", "Offers"],
    ["/jobs?tab=agency", "Offers"],
    ["/jobs?tab=forme", "For you"],
    ["/jobs?tab=mine", "Saved"],
    ["/profile", "My Profile"],
  ])("%s highlights %s", (route, label) => {
    renderAt(route);
    expect(current().map((l) => l.textContent)).toEqual([label]);
  });

  it("highlights nothing on pages that are not in the bar", () => {
    renderAt("/coach");
    expect(current()).toEqual([]);
  });

  it("shows how many offers are saved, and names it for screen readers", () => {
    saved.items = [{}, {}, {}];
    renderAt("/jobs");

    expect(screen.getByRole("link", { name: "Saved (3)" })).toBeInTheDocument();
    expect(screen.getByText("3")).toHaveAttribute("aria-hidden", "true");
  });

  it("shows no badge when nothing is saved", () => {
    renderAt("/jobs");
    expect(screen.getByRole("link", { name: "Saved" })).toBeInTheDocument();
    expect(screen.queryByText("0")).not.toBeInTheDocument();
  });

  it("is translated", async () => {
    const { default: i18n } = await import("../../i18n");
    await i18n.changeLanguage("fr");
    renderAt("/");

    expect(screen.getByRole("navigation", { name: "Navigation rapide" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Accueil" })).toBeInTheDocument();
    await i18n.changeLanguage("en");
  });
});

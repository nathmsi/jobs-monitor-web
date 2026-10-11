import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../../i18n";
import type { Suggestion } from "../../api/client";
import { SearchBox } from "./SearchBox";

const SUGGESTIONS: Suggestion[] = [
  { type: "role", label: "Mobile", value: "mobile", count: 37 },
  { type: "skill", label: "React", value: "React", count: 16 },
  { type: "skill", label: "React Native", value: "React Native", count: 5 },
  { type: "company", label: "Reddit", value: "Reddit", count: 2 },
];
const POPULAR: Suggestion[] = [
  { type: "role", label: "Backend", value: "backend", count: 130 },
  { type: "skill", label: "Python", value: "Python", count: 26 },
];

const hooks = vi.hoisted(() => ({
  suggestions: [] as Suggestion[],
  popular: [] as Suggestion[],
}));
vi.mock("../../api/hooks", () => ({
  useSuggestions: (text: string) => ({ data: text.trim() ? hooks.suggestions : undefined }),
  usePopularSearches: () => ({ data: hooks.popular }),
}));

const handlers = { onSubmit: vi.fn(), onPick: vi.fn(), onSubmitIntent: vi.fn() };

function Harness(props: { initial?: string; variant?: "hero" | "compact"; clear?: boolean }) {
  const [value, setValue] = useState(props.initial ?? "");
  return (
    <SearchBox
      id="sb"
      value={value}
      onValueChange={setValue}
      onSubmit={handlers.onSubmit}
      onPick={handlers.onPick}
      label="Search offers"
      placeholder="Search…"
      variant={props.variant}
      submitLabel={props.variant === "hero" ? "Search" : undefined}
      onSubmitIntent={handlers.onSubmitIntent}
      clearLabel={props.clear ? "Clear" : undefined}
    />
  );
}

const input = () => screen.getByRole("combobox", { name: "Search offers" });
const options = () => screen.queryAllByRole("option").map((o) => o.textContent);

beforeEach(() => {
  hooks.suggestions = SUGGESTIONS;
  hooks.popular = POPULAR;
  Object.values(handlers).forEach((h) => h.mockReset());
  localStorage.clear();
});

describe("SearchBox · popup content", () => {
  it("is closed until the field is used", () => {
    render(<Harness />);
    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("option")).not.toBeInTheDocument();
  });

  it("empty and focused: shows popular searches with their counts", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());

    expect(input()).toHaveAttribute("aria-expanded", "true");
    expect(within(screen.getByRole("group", { name: "Popular" })).getAllByRole("option").map((o) => o.textContent)).toEqual([
      "Backend130",
      "Python26",
    ]);
  });

  it("typing: groups the suggestions by kind, with counts", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "re");

    expect(screen.getByRole("group", { name: "Roles" })).toHaveTextContent("Mobile37");
    expect(within(screen.getByRole("group", { name: "Technologies" })).getAllByRole("option")).toHaveLength(2);
    expect(screen.getByRole("group", { name: "Companies" })).toHaveTextContent("Reddit2");
    expect(screen.queryByRole("group", { name: "Job titles" })).not.toBeInTheDocument();
  });

  it("emphasises what was typed", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "Rea");

    const react = screen.getByRole("option", { name: /^React16$/ });
    expect(within(react).getByText("Rea").tagName).toBe("STRONG");
  });

  it("lists groups by their best match, so the first row is the best answer", async () => {
    hooks.suggestions = [
      { type: "skill", label: "React", value: "React", count: 16 },
      { type: "role", label: "Frontend", value: "frontend", count: 65 },
    ];
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "react");

    expect(screen.getAllByRole("group").map((g) => g.getAttribute("aria-label"))).toEqual(["Technologies", "Roles"]);
    await user.keyboard("{ArrowDown}{Enter}");
    expect(handlers.onPick).toHaveBeenCalledWith(hooks.suggestions[0]);
  });

  it("stays closed when there is nothing to suggest", async () => {
    hooks.suggestions = [];
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "zzz");

    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("announces how many suggestions are available", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "re");

    expect(screen.getByText("4 suggestions available")).toBeInTheDocument();
  });
});

describe("SearchBox · accessibility", () => {
  it("is a combobox wired to its listbox", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    const list = screen.getByRole("listbox", { name: "Search suggestions" });
    expect(input()).toHaveAttribute("aria-controls", list.id);
    expect(input()).toHaveAttribute("aria-autocomplete", "list");
    expect(screen.getByRole("search")).toBeInTheDocument();
  });

  it("moves aria-activedescendant with the arrow keys and wraps around", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");
    expect(input()).not.toHaveAttribute("aria-activedescendant");

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    expect(input()).toHaveAttribute("aria-activedescendant", screen.getAllByRole("option")[0].id);

    await user.keyboard("{ArrowDown}{ArrowDown}{ArrowDown}");
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowDown}");
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");
  });

  it("ArrowUp from nothing jumps to the last option; ArrowDown reopens a closed popup", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.keyboard("{ArrowUp}");
    expect(screen.getAllByRole("option")[3]).toHaveAttribute("aria-selected", "true");

    await user.keyboard("{Escape}");
    expect(input()).toHaveAttribute("aria-expanded", "false");
    await user.keyboard("{ArrowDown}");
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });

  it("every option has a stable, unique id", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    const ids = screen.getAllByRole("option").map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids.every((id) => id.startsWith("sb-option-"))).toBe(true);
  });
});

describe("SearchBox · choosing", () => {
  it("Enter on the active option picks it (and does not submit the form)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.keyboard("{ArrowDown}{Enter}");

    expect(handlers.onPick).toHaveBeenCalledWith(SUGGESTIONS[0]);
    expect(handlers.onSubmit).not.toHaveBeenCalled();
    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("Enter without an active option searches the typed text, trimmed", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "  c# dev {Enter}");

    expect(handlers.onSubmit).toHaveBeenCalledWith("c# dev");
    expect(handlers.onPick).not.toHaveBeenCalled();
  });

  it("clicking an option picks it without losing focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.click(screen.getByRole("option", { name: /^React Native/ }));

    expect(handlers.onPick).toHaveBeenCalledWith(SUGGESTIONS[2]);
    expect(input()).toHaveFocus();
  });

  it("Escape closes the popup but keeps the text", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.keyboard("{Escape}");

    expect(input()).toHaveAttribute("aria-expanded", "false");
    expect(input()).toHaveValue("re");
  });

  it("closes when the field loses focus", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.tab();

    expect(input()).toHaveAttribute("aria-expanded", "false");
  });

  it("hovering an option makes it the active one", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");

    await user.hover(screen.getAllByRole("option")[2]);

    expect(screen.getAllByRole("option")[2]).toHaveAttribute("aria-selected", "true");
  });
});

describe("SearchBox · recent searches", () => {
  const recents = () => JSON.parse(localStorage.getItem("recentSearches.v1") ?? "[]");

  it("remembers submitted text and picked suggestions, newest first, without duplicates", async () => {
    const user = userEvent.setup();
    render(<Harness />);

    await user.type(input(), "python{Enter}");
    await user.clear(input());
    await user.type(input(), "re");
    await user.click(screen.getByRole("option", { name: /^Mobile/ }));
    await user.clear(input());
    await user.type(input(), "PYTHON{Enter}");

    expect(recents().map((r: { label: string }) => r.label)).toEqual(["PYTHON", "Mobile"]);
    expect(recents()[1]).toEqual({ kind: "role", label: "Mobile", value: "mobile" });
  });

  it("keeps only the last five", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    for (const q of ["a1", "b2", "c3", "d4", "e5", "f6"]) {
      await user.clear(input());
      await user.type(input(), `${q}{Enter}`);
    }
    expect(recents().map((r: { label: string }) => r.label)).toEqual(["f6", "e5", "d4", "c3", "b2"]);
  });

  it("shows them first when the field is empty, and a recent text search runs again", async () => {
    localStorage.setItem("recentSearches.v1", JSON.stringify([{ kind: "text", label: "kotlin", value: "kotlin" }]));
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    expect(screen.getByRole("group", { name: "Recent searches" })).toHaveTextContent("kotlin");

    await user.click(screen.getByRole("option", { name: "kotlin" }));
    expect(handlers.onSubmit).toHaveBeenCalledWith("kotlin");
    expect(input()).toHaveValue("kotlin");
  });

  it("a recent role is picked as a role", async () => {
    localStorage.setItem("recentSearches.v1", JSON.stringify([{ kind: "role", label: "Mobile", value: "mobile" }]));
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    await user.click(screen.getByRole("option", { name: "Mobile" }));

    expect(handlers.onPick).toHaveBeenCalledWith({ type: "role", label: "Mobile", value: "mobile", count: 0 });
  });

  it("can be cleared", async () => {
    localStorage.setItem("recentSearches.v1", JSON.stringify([{ kind: "text", label: "kotlin", value: "kotlin" }]));
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(input());
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.queryByRole("group", { name: "Recent searches" })).not.toBeInTheDocument();
    expect(recents()).toEqual([]);
  });

  it("ignores corrupted storage", async () => {
    localStorage.setItem("recentSearches.v1", "{nope");
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(input());
    expect(screen.queryByRole("group", { name: "Recent searches" })).not.toBeInTheDocument();
  });
});

describe("SearchBox · other controls", () => {
  it("the clear button appears with text, empties the field and searches nothing", async () => {
    const user = userEvent.setup();
    render(<Harness clear />);
    expect(screen.queryByRole("button", { name: "Clear" })).not.toBeInTheDocument();

    await user.type(input(), "abc");
    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(input()).toHaveValue("");
    expect(handlers.onSubmit).toHaveBeenCalledWith("");
    expect(input()).toHaveFocus();
    // The box keeps focus, so the popup reopens with the popular searches.
    expect(input()).toHaveAttribute("aria-expanded", "true");
  });

  it("hero variant has a visible submit button that searches and signals intent", async () => {
    const user = userEvent.setup();
    render(<Harness variant="hero" />);

    await user.type(input(), "ios");
    await user.hover(screen.getByRole("button", { name: "Search" }));
    expect(handlers.onSubmitIntent).toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Search" }));
    expect(handlers.onSubmit).toHaveBeenCalledWith("ios");
  });

  it("drops the popup while the next suggestions are not typed yet (value change resets the active row)", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");
    await user.keyboard("{ArrowDown}");

    await act(async () => {
      await user.type(input(), "a");
    });

    expect(input()).not.toHaveAttribute("aria-activedescendant");
  });

  it("options() helper sanity", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.type(input(), "re");
    expect(options()).toEqual(["Mobile37", "React16", "React Native5", "Reddit2"]);
  });
});

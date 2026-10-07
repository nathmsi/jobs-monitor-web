import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import "../../i18n";
import type { Filters } from "../../types";
import { Sidebar } from "./Sidebar";

vi.mock("../../api/hooks", () => ({
  useRegions: () => ({ data: [{ key: "all", label_en: "All", label_he: "הכל", label_fr: "Tout" }] }),
}));
vi.mock("../../providers/jobFlags/useJobFlags", () => ({
  useJobFlags: () => ({ hideSeen: false, setHideSeen: vi.fn() }),
}));
vi.mock("../../providers/savedJobs/useSavedJobs", () => ({
  useSavedJobs: () => ({ appliedCount: 2 }),
}));

// Latest filters seen by the harness (mutated in an effect, read by assertions).
const latest: { filters: Filters } = { filters: { region: "all", q: "" } };
function Harness({ initial }: { initial: Filters }) {
  const [state, setState] = useState(initial);
  useEffect(() => {
    latest.filters = state;
  });
  return (
    <QueryClientProvider client={new QueryClient()}>
      <Sidebar filters={state} onChange={setState} />
      <button onClick={() => setState((f) => ({ ...f, q: "external" }))}>external</button>
    </QueryClientProvider>
  );
}

const BASE: Filters = { region: "all", q: "" };

describe("Sidebar", () => {
  beforeEach(() => vi.useFakeTimers({ shouldAdvanceTime: true }));
  afterEach(() => vi.useRealTimers());

  it("debounces the search by 250ms", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={BASE} />);

    await user.type(screen.getByRole("textbox", { name: /search/i }), "react");
    expect(latest.filters.q).toBe("");

    act(() => vi.advanceTimersByTime(260));
    expect(latest.filters.q).toBe("react");
  });

  it("does not overwrite a filter changed while the search was pending", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={BASE} />);

    await user.type(screen.getByRole("textbox", { name: /search/i }), "go");
    await user.click(screen.getByRole("button", { name: "Frontend" }));
    act(() => vi.advanceTimersByTime(260));

    expect(latest.filters).toMatchObject({ q: "go", role: "frontend" });
  });

  it("clears the search immediately with the clear button", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={{ ...BASE, q: "node" }} />);

    await user.click(screen.getByRole("button", { name: "Clear" }));

    expect(screen.getByRole("textbox", { name: /search/i })).toHaveValue("");
    expect(latest.filters.q).toBe("");
  });

  it("adopts a query changed from outside", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={BASE} />);

    await user.click(screen.getByRole("button", { name: "external" }));

    expect(screen.getByRole("textbox", { name: /search/i })).toHaveValue("external");
  });

  it("toggles a role on and off", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={BASE} />);
    const chip = screen.getByRole("button", { name: "Frontend" });

    await user.click(chip);
    expect(latest.filters.role).toBe("frontend");
    expect(chip).toHaveAttribute("aria-pressed", "true");

    await user.click(chip);
    expect(latest.filters.role).toBeUndefined();
  });

  it("expands the role list", async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(<Harness initial={BASE} />);
    const before = screen.getAllByRole("button", { pressed: false }).length;

    await user.click(screen.getByRole("button", { name: /more$/ }));

    expect(screen.getAllByRole("button", { pressed: false }).length).toBeGreaterThan(before);
    expect(screen.getByRole("button", { name: "Show less" })).toBeInTheDocument();
  });

  it("shows the number of applications", () => {
    render(<Harness initial={BASE} />);
    expect(screen.getByText("2 applications")).toBeInTheDocument();
  });
});

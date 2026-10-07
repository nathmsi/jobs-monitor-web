import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import "../../i18n";
import type { Filters } from "../../types";
import { ActiveFilters } from "./ActiveFilters";

vi.mock("../../api/hooks", () => ({
  useRegions: () => ({
    data: [
      { key: "all", label_en: "All Israel", label_he: "כל ישראל", label_fr: "Tout Israël" },
      { key: "tlv", label_en: "Tel Aviv", label_he: "תל אביב", label_fr: "Tel Aviv" },
    ],
  }),
}));

const NONE: Filters = { region: "all", q: "", roles: [] };

function setup(filters: Filters, total?: number) {
  const onChange = vi.fn();
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ActiveFilters filters={filters} total={total} onChange={onChange} />
    </QueryClientProvider>,
  );
  /** Applies the updater the component passed to `onChange` on top of `filters`. */
  const applied = () => onChange.mock.calls.at(-1)![0](filters) as Filters;
  return { user, onChange, applied };
}

describe("ActiveFilters", () => {
  it("renders nothing without filters and without a count", () => {
    const { onChange } = setup(NONE);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("shows the number of offers, singular and plural", () => {
    const { unmount } = render(
      <QueryClientProvider client={new QueryClient()}>
        <ActiveFilters filters={NONE} total={1} onChange={vi.fn()} />
      </QueryClientProvider>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("1 offer");
    unmount();

    setup(NONE, 128);
    expect(screen.getByRole("status")).toHaveTextContent("128 offers");
  });

  it("shows one chip per active filter", () => {
    setup({ region: "tlv", q: "react", roles: ["mobile", "frontend"], category: "fintech" }, 5);

    const chips = screen.getByRole("list", { name: "Active filters" });
    expect(chips).toHaveTextContent("“react”");
    expect(chips).toHaveTextContent("Mobile");
    expect(chips).toHaveTextContent("Frontend");
    expect(chips).toHaveTextContent("Fintech");
    expect(chips).toHaveTextContent("Tel Aviv");
  });

  it("removes only the clicked filter", async () => {
    const filters: Filters = { region: "all", q: "react", roles: ["mobile", "frontend"] };
    const { user, applied } = setup(filters, 3);

    await user.click(screen.getByRole("button", { name: "Remove filter Mobile" }));
    expect(applied()).toEqual({ region: "all", q: "react", roles: ["frontend"] });

    await user.click(screen.getByRole("button", { name: "Remove filter “react”" }));
    expect(applied()).toEqual({ region: "all", q: "", roles: ["mobile", "frontend"] });
  });

  it("resets the region from its chip", async () => {
    const { user, applied } = setup({ region: "tlv", q: "", roles: [] }, 3);
    await user.click(screen.getByRole("button", { name: "Remove filter Tel Aviv" }));
    expect(applied().region).toBe("all");
  });

  it("offers 'Clear all' only when several filters are active", async () => {
    const one = setup({ ...NONE, q: "go" }, 3);
    expect(screen.queryByRole("button", { name: "Clear all" })).not.toBeInTheDocument();
    expect(one.onChange).not.toHaveBeenCalled();
  });

  it("'Clear all' resets search, roles, category and region", async () => {
    const { user, applied } = setup({ region: "tlv", q: "go", roles: ["backend"], category: "fintech" }, 2);

    await user.click(screen.getByRole("button", { name: "Clear all" }));

    expect(applied()).toEqual({ region: "all", q: "", roles: [], category: undefined });
  });
});

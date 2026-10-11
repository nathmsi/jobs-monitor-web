import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { UpdatedAgo } from "./UpdatedAgo";

const stats = vi.hoisted(() => ({ data: undefined as { updated_at: string | null } | undefined }));
vi.mock("../../api/hooks", () => ({ useStats: () => ({ data: stats.data }) }));

describe("UpdatedAgo", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    stats.data = undefined;
  });

  it("says when the data was last updated, with a machine-readable date", () => {
    const at = new Date(Date.now() - 12 * 60_000).toISOString();
    stats.data = { updated_at: at };
    render(<UpdatedAgo />);

    expect(screen.getByText(/^Updated/)).toHaveTextContent("Updated 12 minutes ago");
    expect(screen.getByText("12 minutes ago")).toHaveAttribute("datetime", at);
  });

  it("is written in the active language", async () => {
    await i18n.changeLanguage("fr");
    stats.data = { updated_at: new Date(Date.now() - 3 * 3600_000).toISOString() };
    render(<UpdatedAgo />);

    expect(screen.getByText(/^Mis à jour/)).toHaveTextContent("Mis à jour il y a 3 heures");
    await i18n.changeLanguage("en");
  });

  it("renders nothing while stats are loading, unknown or invalid", () => {
    const { container, rerender } = render(<UpdatedAgo />);
    expect(container).toBeEmptyDOMElement();

    stats.data = { updated_at: null };
    rerender(<UpdatedAgo />);
    expect(container).toBeEmptyDOMElement();

    stats.data = { updated_at: "garbage" };
    rerender(<UpdatedAgo />);
    expect(container).toBeEmptyDOMElement();
  });

  it("passes its class name through", () => {
    stats.data = { updated_at: new Date().toISOString() };
    render(<UpdatedAgo className="note" />);
    expect(screen.getByText(/^Updated/)).toHaveClass("note");
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { ErrorBoundary } from "./ErrorBoundary";

function Bomb({ explode }: { explode: boolean }) {
  if (explode) throw new Error("kaboom");
  return <p>all good</p>;
}

function Harness() {
  const [explode, setExplode] = useState(true);
  return (
    <>
      <button onClick={() => setExplode(false)}>defuse</button>
      <ErrorBoundary>
        <Bomb explode={explode} />
      </ErrorBoundary>
    </>
  );
}

describe("ErrorBoundary", () => {
  afterEach(async () => {
    vi.restoreAllMocks();
    await i18n.changeLanguage("en");
  });

  it("renders children when nothing throws", () => {
    render(
      <ErrorBoundary>
        <Bomb explode={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("shows a translated fallback and logs the error", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("Something went wrong. Please reload the page.");
    expect(log).toHaveBeenCalled();
  });

  it("follows the active language", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await i18n.changeLanguage("fr");
    render(
      <ErrorBoundary>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Une erreur est survenue");
  });

  it("recovers when 'Try again' is pressed after the cause is gone", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const user = userEvent.setup();
    render(<Harness />);

    await user.click(screen.getByRole("button", { name: "defuse" }));
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(screen.getByText("all good")).toBeInTheDocument();
  });

  it("uses a custom fallback when provided", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<p>custom</p>}>
        <Bomb explode />
      </ErrorBoundary>,
    );
    expect(screen.getByText("custom")).toBeInTheDocument();
  });
});

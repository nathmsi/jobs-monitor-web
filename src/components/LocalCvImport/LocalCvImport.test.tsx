import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../../i18n";
import { LocalCvImport } from "./LocalCvImport";

const importer = vi.hoisted(() => ({
  busy: false,
  error: null as string | null,
  fromFile: vi.fn(async () => true),
  fromText: vi.fn(() => true),
  clearError: vi.fn(),
}));
vi.mock("../../hooks/useLocalCvImport", () => ({ useLocalCvImport: () => importer }));

const props = { hasProfile: false, skillCount: 0 };

describe("LocalCvImport", () => {
  beforeEach(() => {
    importer.busy = false;
    importer.error = null;
    importer.fromFile.mockReset().mockResolvedValue(true);
    importer.fromText.mockReset().mockReturnValue(true);
    importer.clearError.mockReset();
  });

  it("explains the privacy promise and offers both ways to add a CV", () => {
    render(<LocalCvImport {...props} />);

    expect(screen.getByText(/no account needed/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Choose a PDF" })).toBeInTheDocument();
    expect(screen.getByLabelText("Paste the text of your CV")).toBeInTheDocument();
  });

  it("cannot analyse an empty box", () => {
    render(<LocalCvImport {...props} />);
    expect(screen.getByRole("button", { name: "Analyse my CV" })).toBeDisabled();
  });

  it("analyses the pasted text, tells the parent and empties the box", async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    render(<LocalCvImport {...props} onImported={onImported} />);

    await user.type(screen.getByLabelText("Paste the text of your CV"), "React and TypeScript developer");
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));

    expect(importer.fromText).toHaveBeenCalledWith("React and TypeScript developer");
    expect(onImported).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Profile ready: 0 skills found")).toBeInTheDocument();
  });

  it("keeps the form (and the text) when the analysis is refused", async () => {
    importer.fromText.mockReturnValue(false);
    importer.error = "That is too short to analyse: paste your whole CV.";
    const user = userEvent.setup();
    const onImported = vi.fn();
    render(<LocalCvImport {...props} onImported={onImported} />);

    await user.type(screen.getByLabelText("Paste the text of your CV"), "React");
    await user.click(screen.getByRole("button", { name: "Analyse my CV" }));

    expect(onImported).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent("too short");
    expect(screen.getByLabelText("Paste the text of your CV")).toHaveValue("React");
  });

  it("clears the error as soon as the text is edited", async () => {
    importer.error = "oops";
    const user = userEvent.setup();
    render(<LocalCvImport {...props} />);

    await user.type(screen.getByLabelText("Paste the text of your CV"), "a");

    expect(importer.clearError).toHaveBeenCalled();
  });

  it("imports a PDF chosen with the file picker", async () => {
    const user = userEvent.setup();
    const onImported = vi.fn();
    render(<LocalCvImport {...props} onImported={onImported} />);
    const file = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });

    await user.upload(screen.getByTestId("cv-file-input"), file);

    expect(importer.fromFile).toHaveBeenCalledWith(file);
    expect(onImported).toHaveBeenCalled();
  });

  it("imports a PDF dropped on the zone, and ignores other files", async () => {
    render(<LocalCvImport {...props} />);
    const zone = screen.getByText("Drop your CV (PDF) here").parentElement!;
    const pdf = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });
    const image = new File(["x"], "me.png", { type: "image/png" });

    const drop = (file: File) => {
      const event = new Event("drop", { bubbles: true, cancelable: true }) as Event & { dataTransfer: unknown };
      event.dataTransfer = { files: [file] };
      zone.dispatchEvent(event);
    };
    drop(image);
    drop(pdf);
    await Promise.resolve();

    expect(importer.fromFile).toHaveBeenCalledTimes(1);
    expect(importer.fromFile).toHaveBeenCalledWith(pdf);
  });

  it("disables the picker while a PDF is being read", () => {
    importer.busy = true;
    render(<LocalCvImport {...props} />);
    expect(screen.getByRole("button", { name: "Reading…" })).toBeDisabled();
  });

  it("with a profile it shows the result and lets you replace the CV, or cancel", async () => {
    const user = userEvent.setup();
    render(<LocalCvImport hasProfile skillCount={8} />);

    expect(screen.getByText("Profile ready: 8 skills found")).toBeInTheDocument();
    expect(screen.queryByLabelText("Paste the text of your CV")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Replace my CV" }));
    expect(screen.getByLabelText("Paste the text of your CV")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByText("Profile ready: 8 skills found")).toBeInTheDocument();
  });

  it("uses the singular for one skill", () => {
    render(<LocalCvImport hasProfile skillCount={1} />);
    expect(screen.getByText("Profile ready: 1 skill found")).toBeInTheDocument();
  });

  it("offers an optional sign-in hint only when sign-in exists", async () => {
    const user = userEvent.setup();
    const onSignIn = vi.fn();
    const { rerender } = render(<LocalCvImport {...props} />);
    expect(screen.queryByRole("button", { name: /Sign in/ })).not.toBeInTheDocument();

    rerender(<LocalCvImport {...props} onSignIn={onSignIn} />);
    await user.click(screen.getByRole("button", { name: "Sign in to keep your CVs on every device" }));
    expect(onSignIn).toHaveBeenCalled();
  });
});

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import i18n from "../../i18n";
import { CVUploadModal } from "./CVUploadModal";

const noop = () => {};
const CVS = [
  { id: "a", name: "CV 2025" },
  { id: "b", name: "CV 2026" },
];

describe("CVUploadModal", () => {
  afterEach(async () => {
    await i18n.changeLanguage("en");
  });

  it("renders nothing while closed", () => {
    const { container } = render(<CVUploadModal open={false} onClose={noop} onUpload={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("is fully translated (no hardcoded English)", async () => {
    await i18n.changeLanguage("fr");
    render(<CVUploadModal open onClose={noop} onUpload={vi.fn()} existingCvs={CVS} />);

    expect(screen.getByText("Importez votre CV")).toBeInTheDocument();
    expect(screen.getByText("Ou choisissez un CV existant")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Annuler" })).toBeInTheDocument();
    expect(screen.queryByText("Cancel")).not.toBeInTheDocument();
  });

  it("explains how to start when there is no CV yet", () => {
    render(<CVUploadModal open onClose={noop} onUpload={vi.fn()} existingCvs={[]} />);
    expect(screen.getByText("Upload a PDF of your CV to get started")).toBeInTheDocument();
    expect(screen.queryByLabelText("Or select existing CV")).not.toBeInTheDocument();
  });

  it("selecting an existing CV reports it and closes the dialog", async () => {
    const user = userEvent.setup();
    const onSelectCv = vi.fn();
    const onClose = vi.fn();
    render(<CVUploadModal open onClose={onClose} onUpload={vi.fn()} existingCvs={CVS} selectedCvId="a" onSelectCv={onSelectCv} />);

    await user.selectOptions(screen.getByLabelText("Or select existing CV"), "b");

    expect(onSelectCv).toHaveBeenCalledWith("b");
    expect(onClose).toHaveBeenCalled();
  });

  it("uploads a chosen PDF", async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<CVUploadModal open onClose={noop} onUpload={onUpload} />);
    const file = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });

    await user.upload(container.querySelector('input[type="file"]')!, file);

    expect(onUpload).toHaveBeenCalledWith(file);
  });

  it("shows an upload error and disables actions while busy", () => {
    render(<CVUploadModal open onClose={noop} onUpload={vi.fn()} busy error="Could not read this PDF" />);

    expect(screen.getByText(/Could not read this PDF/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });

  it("closes from the close button, the backdrop-free cancel button", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<CVUploadModal open onClose={onClose} onUpload={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Close" }));
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onClose).toHaveBeenCalledTimes(2);
  });
});

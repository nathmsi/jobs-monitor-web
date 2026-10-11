import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../i18n";
import { useLocalCvImport } from "./useLocalCvImport";

const profile = vi.hoisted(() => ({ saveProfile: vi.fn() }));
const pdf = vi.hoisted(() => ({ extractPdfText: vi.fn() }));
vi.mock("../providers/profile/useProfile", () => ({ useProfile: () => ({ saveProfile: profile.saveProfile }) }));
vi.mock("../utils/pdf", () => pdf);

const CV = "Senior frontend developer with six years of React and TypeScript, plus Node.js and PostgreSQL.";

describe("useLocalCvImport", () => {
  beforeEach(() => {
    profile.saveProfile.mockReset();
    pdf.extractPdfText.mockReset();
  });

  it("analyses pasted text and saves the extracted profile only", () => {
    const { result } = renderHook(() => useLocalCvImport());

    let ok = false;
    act(() => {
      ok = result.current.fromText(CV);
    });

    expect(ok).toBe(true);
    expect(result.current.error).toBeNull();
    const saved = profile.saveProfile.mock.calls[0][0];
    expect(saved.skills).toEqual(expect.arrayContaining(["React", "TypeScript"]));
    expect(saved.roles).toContain("frontend");
    // The CV text itself is not part of what is stored.
    expect(JSON.stringify(saved)).not.toContain("six years");
  });

  it("refuses text that is too short", () => {
    const { result } = renderHook(() => useLocalCvImport());

    let ok = true;
    act(() => {
      ok = result.current.fromText("React");
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("That is too short to analyse: paste your whole CV.");
    expect(profile.saveProfile).not.toHaveBeenCalled();
  });

  it("refuses text with no technical skill", () => {
    const { result } = renderHook(() => useLocalCvImport());

    act(() => {
      result.current.fromText("I enjoy gardening, cooking and long walks in the countryside every weekend.");
    });

    expect(result.current.error).toMatch(/could not find any technical skill/);
    expect(profile.saveProfile).not.toHaveBeenCalled();
  });

  it("reads a PDF with pdf.js, then analyses its text", async () => {
    pdf.extractPdfText.mockResolvedValue(CV);
    const { result } = renderHook(() => useLocalCvImport());
    const file = new File(["%PDF"], "cv.pdf", { type: "application/pdf" });

    let ok = false;
    await act(async () => {
      ok = await result.current.fromFile(file);
    });

    expect(ok).toBe(true);
    expect(pdf.extractPdfText).toHaveBeenCalledWith(file);
    expect(profile.saveProfile).toHaveBeenCalledTimes(1);
    expect(result.current.busy).toBe(false);
  });

  it("reports an unreadable PDF", async () => {
    pdf.extractPdfText.mockRejectedValueOnce(new Error("corrupt"));
    const { result } = renderHook(() => useLocalCvImport());

    let ok = true;
    await act(async () => {
      ok = await result.current.fromFile(new File(["x"], "bad.pdf"));
    });

    expect(ok).toBe(false);
    expect(result.current.error).toBe("Could not read this PDF. Paste the text instead.");
    expect(result.current.busy).toBe(false);
  });

  it("applies the same checks to the text of a PDF", async () => {
    pdf.extractPdfText.mockResolvedValue("too short");
    const { result } = renderHook(() => useLocalCvImport());

    await act(async () => {
      await result.current.fromFile(new File(["x"], "cv.pdf"));
    });

    expect(result.current.error).toMatch(/too short/);
  });

  it("clears an old error on the next attempt and on demand", async () => {
    const { result } = renderHook(() => useLocalCvImport());
    act(() => {
      result.current.fromText("x");
    });
    expect(result.current.error).not.toBeNull();

    act(() => result.current.clearError());
    expect(result.current.error).toBeNull();

    act(() => {
      result.current.fromText("x");
      result.current.fromText(CV);
    });
    expect(result.current.error).toBeNull();
  });
});

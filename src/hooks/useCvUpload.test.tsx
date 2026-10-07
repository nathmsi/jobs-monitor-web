import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../i18n";
import { useCvUpload } from "./useCvUpload";

const extractPdfText = vi.hoisted(() => vi.fn());
vi.mock("../utils/pdf", () => ({ extractPdfText }));

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });
const CV = { id: "1", name: "x", text: "t", created_at: "" };

describe("useCvUpload", () => {
  beforeEach(() => extractPdfText.mockReset());

  it("extracts the text, saves the CV under the file name (without .pdf) and reports success", async () => {
    extractPdfText.mockResolvedValue("cv text");
    const addCv = vi.fn().mockResolvedValue(CV);
    const { result } = renderHook(() => useCvUpload(addCv));

    let ok = false;
    await act(async () => {
      ok = await result.current.upload(pdf("Jane Doe CV.pdf"));
    });

    expect(ok).toBe(true);
    expect(addCv).toHaveBeenCalledWith("Jane Doe CV", "cv text");
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it("truncates very long names to 60 characters", async () => {
    extractPdfText.mockResolvedValue("t");
    const addCv = vi.fn().mockResolvedValue(CV);
    const { result } = renderHook(() => useCvUpload(addCv));

    await act(async () => {
      await result.current.upload(pdf("a".repeat(100) + ".pdf"));
    });

    expect(addCv.mock.calls[0][0]).toHaveLength(60);
  });

  it("reports an error when the PDF cannot be read", async () => {
    extractPdfText.mockRejectedValueOnce(new Error("corrupt"));
    const addCv = vi.fn();
    const { result } = renderHook(() => useCvUpload(addCv));

    let ok = true;
    await act(async () => {
      ok = await result.current.upload(pdf("bad.pdf"));
    });

    expect(ok).toBe(false);
    expect(addCv).not.toHaveBeenCalled();
    expect(result.current.error).toBe("Could not read this PDF — paste the text instead.");
    expect(result.current.busy).toBe(false);
  });

  it("reports an error when the CV could not be saved", async () => {
    extractPdfText.mockResolvedValue("t");
    const { result } = renderHook(() => useCvUpload(vi.fn().mockResolvedValue(null)));

    let ok = true;
    await act(async () => {
      ok = await result.current.upload(pdf("a.pdf"));
    });

    expect(ok).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it("clears a previous error on the next attempt", async () => {
    extractPdfText.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce("ok");
    const { result } = renderHook(() => useCvUpload(vi.fn().mockResolvedValue(CV)));

    await act(async () => {
      await result.current.upload(pdf("a.pdf"));
    });
    expect(result.current.error).not.toBeNull();

    await act(async () => {
      await result.current.upload(pdf("a.pdf"));
    });
    expect(result.current.error).toBeNull();
  });
});

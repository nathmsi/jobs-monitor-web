import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../i18n";
import { useCvUpload } from "./useCvUpload";

const extractPdfText = vi.hoisted(() => vi.fn());
const extractCvText = vi.hoisted(() => vi.fn());
vi.mock("../utils/pdf", () => ({ extractPdfText }));
vi.mock("../api/client", () => ({ extractCvText }));

const pdf = (name: string) => new File(["%PDF"], name, { type: "application/pdf" });
/** A real CV has more than a few characters: the upload refuses anything the API would refuse. */
const TEXT = "Senior backend engineer with seven years of experience in Node.js and TypeScript.";
const CV = { id: "1", name: "x", text: TEXT, created_at: "" };

describe("useCvUpload", () => {
  beforeEach(() => {
    extractPdfText.mockReset();
    extractCvText.mockReset().mockResolvedValue(""); // the server reader finds nothing unless a test says otherwise
  });

  it("extracts the text, saves the CV under the file name (without .pdf) and reports success", async () => {
    extractPdfText.mockResolvedValue(TEXT);
    const addCv = vi.fn().mockResolvedValue(CV);
    const { result } = renderHook(() => useCvUpload(addCv));

    let ok = false;
    await act(async () => {
      ok = await result.current.upload(pdf("Jane Doe CV.pdf"));
    });

    expect(ok).toBe(true);
    expect(addCv).toHaveBeenCalledWith("Jane Doe CV", TEXT);
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });

  it("truncates very long names to 60 characters", async () => {
    extractPdfText.mockResolvedValue(TEXT);
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
    extractPdfText.mockResolvedValue(TEXT);
    const { result } = renderHook(() => useCvUpload(vi.fn().mockResolvedValue(null)));

    let ok = true;
    await act(async () => {
      ok = await result.current.upload(pdf("a.pdf"));
    });

    expect(ok).toBe(false);
    expect(result.current.error).not.toBeNull();
  });

  it("clears a previous error on the next attempt", async () => {
    extractPdfText.mockRejectedValueOnce(new Error("x")).mockResolvedValueOnce(TEXT);
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

  describe("a PDF the browser cannot read (scan, or fonts without a text mapping)", () => {
    it("is read by the server instead, and saved with that text", async () => {
      extractPdfText.mockResolvedValue("");
      extractCvText.mockResolvedValue(TEXT);
      const addCv = vi.fn().mockResolvedValue(CV);
      const { result } = renderHook(() => useCvUpload(addCv));
      const file = pdf("Scan.pdf");

      let ok = false;
      await act(async () => {
        ok = await result.current.upload(file);
      });

      expect(ok).toBe(true);
      expect(extractCvText).toHaveBeenCalledWith(file);
      expect(addCv).toHaveBeenCalledWith("Scan", TEXT);
      expect(result.current.error).toBeNull();
    });

    it("is not sent to the server when the browser read it fine", async () => {
      extractPdfText.mockResolvedValue(TEXT);
      const { result } = renderHook(() => useCvUpload(vi.fn().mockResolvedValue(CV)));
      await act(async () => {
        await result.current.upload(pdf("ok.pdf"));
      });
      expect(extractCvText).not.toHaveBeenCalled();
    });

    it.each([["nothing", ""], ["whitespace", "  \n \n   ".repeat(20)], ["a few stray characters", "Page 1"]])(
      "is not saved when neither reader finds text: %s",
      async (_name, text) => {
        extractPdfText.mockResolvedValue(text);
        extractCvText.mockResolvedValue(text);
        const addCv = vi.fn();
        const { result } = renderHook(() => useCvUpload(addCv));

        let ok = true;
        await act(async () => {
          ok = await result.current.upload(pdf("Scan.pdf"));
        });

        expect(ok).toBe(false);
        expect(addCv).not.toHaveBeenCalled(); // no empty CV row in the database
        expect(result.current.error).toMatch(/couldn't read any text/i);
        expect(result.current.busy).toBe(false);
      },
    );

    it("is not saved when the server reader fails, and the upload does not crash", async () => {
      extractPdfText.mockResolvedValue("");
      extractCvText.mockRejectedValue(new Error("HTTP 503"));
      const addCv = vi.fn();
      const { result } = renderHook(() => useCvUpload(addCv));

      let ok = true;
      await act(async () => {
        ok = await result.current.upload(pdf("Scan.pdf"));
      });

      expect(ok).toBe(false);
      expect(addCv).not.toHaveBeenCalled();
      expect(result.current.error).toMatch(/couldn't read any text/i);
    });

    it("accepts a CV right at the minimum length", async () => {
      extractPdfText.mockResolvedValue("x".repeat(50));
      const addCv = vi.fn().mockResolvedValue(CV);
      const { result } = renderHook(() => useCvUpload(addCv));
      await act(async () => {
        await result.current.upload(pdf("a.pdf"));
      });
      expect(addCv).toHaveBeenCalledTimes(1);
    });

    it("lets the user try again with a good PDF afterwards", async () => {
      extractPdfText.mockResolvedValueOnce("").mockResolvedValueOnce(TEXT);
      const addCv = vi.fn().mockResolvedValue(CV);
      const { result } = renderHook(() => useCvUpload(addCv));

      await act(async () => {
        await result.current.upload(pdf("scan.pdf"));
      });
      expect(result.current.error).not.toBeNull();

      let ok = false;
      await act(async () => {
        ok = await result.current.upload(pdf("text.pdf"));
      });
      expect(ok).toBe(true);
      expect(result.current.error).toBeNull();
      expect(addCv).toHaveBeenCalledWith("text", TEXT);
    });
  });
});

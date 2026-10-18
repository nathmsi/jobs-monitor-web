import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import "../i18n";
import type { CvProfile } from "../utils/cvAnalysis";
import { MAX_CV_FILE_BYTES, useChatShare } from "./useChatShare";

const mocks = vi.hoisted(() => ({
  profile: null as unknown,
  cvs: [] as { id: string; name: string; text: string; created_at: string }[],
  fromText: vi.fn(),
  importError: null as string | null,
  extractPdfText: vi.fn(),
}));
vi.mock("../providers/profile/useProfile", () => ({ useProfile: () => ({ profile: mocks.profile }) }));
vi.mock("./useCvs", () => ({ useCvs: () => ({ cvs: mocks.cvs }) }));
vi.mock("./useLocalCvImport", () => ({ useLocalCvImport: () => ({ error: mocks.importError, fromText: mocks.fromText, clearError: vi.fn() }) }));
vi.mock("../utils/pdf", () => ({ extractPdfText: mocks.extractPdfText }));

const PROFILE: CvProfile = {
  skills: ["Node.js"], roles: ["backend"], languages: [], seniority: "Senior", years: 6, locations: [], titles: ["Backend Engineer"], education: [], certifications: [],
};
const CV_TEXT = "Senior Backend Engineer with six years of Node.js, PostgreSQL and TypeScript. ".repeat(2);
const pdf = (name = "cv.pdf", size = 100, type = "application/pdf") => new File(["x".repeat(size)], name, { type });

function setup(enabled = true) {
  const setEnabled = vi.fn();
  const hook = renderHook(() => useChatShare(enabled, setEnabled));
  return { ...hook, setEnabled };
}

beforeEach(() => {
  mocks.profile = null;
  mocks.cvs = [];
  mocks.importError = null;
  mocks.fromText.mockReset().mockReturnValue(true);
  mocks.extractPdfText.mockReset().mockResolvedValue(CV_TEXT);
});

describe("useChatShare · what is shared", () => {
  it("shares nothing when there is nothing to share", () => {
    const { result } = setup(true);
    expect(result.current.available).toBe(false);
    expect(result.current.payload).toBeNull();
  });

  it("shares nothing while the switch is off, even with a profile", () => {
    mocks.profile = PROFILE;
    const { result } = setup(false);
    expect(result.current.available).toBe(true);
    expect(result.current.payload).toBeNull();
  });

  it("with the switch on, shares the profile as the API takes it (no education, no certifications)", () => {
    mocks.profile = PROFILE;
    const { result } = setup(true);
    expect(result.current.payload?.profile).toEqual({
      skills: ["Node.js"], roles: ["backend"], languages: [], locations: [], titles: ["Backend Engineer"], seniority: "Senior", years: 6,
    });
    expect(result.current.skillCount).toBe(1);
  });

  it("shares the saved CVs of the account that have a readable text", () => {
    mocks.cvs = [
      { id: "a", name: "A.pdf", text: CV_TEXT, created_at: "" },
      { id: "b", name: "B.pdf", text: "short", created_at: "" },
    ];
    const { result } = setup(true);
    expect(result.current.payload?.cvs?.map((c) => c.id)).toEqual(["a"]);
    expect(result.current.cvCount).toBe(1);
  });

  it("gives the same payload object while nothing changes, so a question is not re-sent for nothing", () => {
    mocks.profile = PROFILE;
    const { result, rerender } = setup(true);
    const first = result.current.payload;
    rerender();
    expect(result.current.payload).toBe(first);
  });
});

describe("useChatShare · attaching a CV", () => {
  it("reads the PDF on the device, saves its profile, shares it, and says so", async () => {
    const { result, setEnabled } = setup(true);

    await act(() => result.current.attach(pdf("Jane_CV.pdf")));

    expect(mocks.extractPdfText).toHaveBeenCalledTimes(1);
    expect(mocks.fromText).toHaveBeenCalledWith(CV_TEXT);
    expect(setEnabled).toHaveBeenCalledWith(true);
    expect(result.current.notice).toContain("Jane_CV.pdf");
    expect(result.current.cvCount).toBe(1);
    expect(result.current.payload?.cvs?.[0]).toMatchObject({ id: "attached", name: "Jane_CV.pdf", text: CV_TEXT.trim() });
    expect(result.current.attaching).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("shows that it is reading while it reads", async () => {
    let release: (text: string) => void = () => {};
    mocks.extractPdfText.mockReturnValue(new Promise<string>((r) => (release = r)));
    const { result } = setup(true);

    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = result.current.attach(pdf());
    });
    await waitFor(() => expect(result.current.attaching).toBe(true));

    await act(async () => {
      release(CV_TEXT);
      await done;
    });
    expect(result.current.attaching).toBe(false);
  });

  it.each([
    ["a file that is not a PDF", pdf("notes.txt", 10, "text/plain"), /PDF/],
    ["a file that is too big", pdf("huge.pdf", MAX_CV_FILE_BYTES + 1), /too big/],
  ])("refuses %s, without reading it", async (_name, file, message) => {
    const { result, setEnabled } = setup(true);
    await act(() => result.current.attach(file));

    expect(result.current.error).toMatch(message);
    expect(mocks.extractPdfText).not.toHaveBeenCalled();
    expect(setEnabled).not.toHaveBeenCalled();
    expect(result.current.cvCount).toBe(0);
  });

  it("accepts a PDF whose type the browser did not tell, by its name", async () => {
    const { result } = setup(true);
    await act(() => result.current.attach(pdf("CV.PDF", 100, "")));
    expect(mocks.extractPdfText).toHaveBeenCalled();
  });

  it("says so when the PDF cannot be read", async () => {
    mocks.extractPdfText.mockRejectedValue(new Error("bad pdf"));
    const { result, setEnabled } = setup(true);
    await act(() => result.current.attach(pdf()));

    expect(result.current.error).toMatch(/Could not read this PDF/);
    expect(setEnabled).not.toHaveBeenCalled();
    expect(result.current.attaching).toBe(false);
  });

  it("shares nothing when the text holds no skill (the import says why)", async () => {
    mocks.fromText.mockReturnValue(false);
    mocks.importError = "We could not find any technical skill in this text.";
    const { result, setEnabled } = setup(true);
    await act(() => result.current.attach(pdf()));

    expect(setEnabled).not.toHaveBeenCalled();
    expect(result.current.cvCount).toBe(0);
    expect(result.current.error).toBe(mocks.importError);
  });

  it("a new attempt clears the notice of the previous one", async () => {
    const { result } = setup(true);
    await act(() => result.current.attach(pdf("first.pdf")));
    expect(result.current.notice).toContain("first.pdf");

    await act(() => result.current.attach(pdf("notes.txt", 10, "text/plain")));
    expect(result.current.notice).toBeNull();
  });
});

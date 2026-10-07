import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const match = vi.fn();
let signedIn = true;

vi.mock("./auth", () => ({
  useAuth: () => ({ user: signedIn ? { id: "u1" } : null, enabled: true }),
}));
vi.mock("./supabase", () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: [], error: null }),
      upsert: (...a: unknown[]) => upsert(...a),
      delete: () => ({ match: (...a: unknown[]) => match(...a) }),
    }),
  },
}));

import { SavedJobsProvider, useSavedJobs } from "./savedJobs";

const job = {
  source: "melio",
  external_id: "e1",
  title: "Frontend Engineer",
  location: "TLV",
  url: null,
};

// One client per test: a client created inside the wrapper would be replaced on
// every re-render and drop the cache.
let qc: QueryClient;
function wrapper({ children }: { children: ReactNode }) {
  return createElement(
    QueryClientProvider,
    { client: qc },
    createElement(SavedJobsProvider, null, children),
  );
}

describe("SavedJobsProvider", () => {
  beforeEach(() => {
    qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    localStorage.clear();
    upsert.mockReset();
    match.mockReset();
    signedIn = true;
  });

  it("keeps the change when the remote write succeeds", async () => {
    upsert.mockResolvedValue({ error: null });
    const { result } = renderHook(() => useSavedJobs(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    let ok = false;
    await act(async () => {
      ok = await result.current.setStatus(job, "saved", "Melio");
    });
    expect(ok).toBe(true);
    // react-query notifies observers asynchronously
    await waitFor(() => expect(result.current.statusOf("melio", "e1")).toBe("saved"));
  });

  it("rolls back and reports failure when the remote write fails", async () => {
    upsert.mockResolvedValue({ error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useSavedJobs(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    let ok = true;
    await act(async () => {
      ok = await result.current.setStatus(job, "saved");
    });
    expect(ok).toBe(false);
    await waitFor(() => expect(result.current.items).toHaveLength(0));
  });

  it("restores the previous status when changing it fails", async () => {
    upsert.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ error: { message: "boom" } });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { result } = renderHook(() => useSavedJobs(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setStatus(job, "saved");
    });
    await act(async () => {
      await result.current.setStatus(job, "applied");
    });
    await waitFor(() => expect(result.current.statusOf("melio", "e1")).toBe("saved"));
  });

  it("persists to localStorage when signed out", async () => {
    signedIn = false;
    const { result } = renderHook(() => useSavedJobs(), { wrapper });
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => {
      await result.current.setStatus(job, "applied");
    });
    expect(upsert).not.toHaveBeenCalled();
    expect(JSON.parse(localStorage.getItem("savedJobs.local.v1") ?? "[]")).toHaveLength(1);
  });
});

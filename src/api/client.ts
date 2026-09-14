import type { Filters, RefreshResult, RegionInfo, SourceInfo } from "../types";

const PROD_API = "https://jobs-monitor-api.fly.dev";

// Prefer the build-time env var. Otherwise fall back by host: localhost only
// during local dev, and the deployed API everywhere else — so a production
// build without the env var still talks to Fly, never to localhost.
function resolveBase(): string {
  const fromEnv = import.meta.env.VITE_API_URL;
  if (fromEnv) return fromEnv;
  const host =
    typeof window !== "undefined" ? window.location.hostname : "";
  return host === "localhost" || host === "127.0.0.1"
    ? "http://localhost:8000"
    : PROD_API;
}

const BASE = resolveBase();

/** The resolved API base URL (for display in error states). */
export const API_BASE = BASE;

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, init);
  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status} — ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export function getSources(): Promise<SourceInfo[]> {
  return request<SourceInfo[]>("/api/sources");
}

export function getRegions(): Promise<RegionInfo[]> {
  return request<RegionInfo[]>("/api/regions");
}

export function refreshSource(
  key: string,
  filters: Filters,
  force = false,
): Promise<RefreshResult> {
  const params = new URLSearchParams({
    region: filters.region,
    q: filters.q,
    force: String(force),
  });
  return request<RefreshResult>(`/api/refresh/${key}?${params}`, {
    method: "POST",
  });
}

import type { Filters, RefreshResult, RegionInfo, SourceInfo } from "../types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

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
): Promise<RefreshResult> {
  const params = new URLSearchParams({ region: filters.region, q: filters.q });
  return request<RefreshResult>(`/api/refresh/${key}?${params}`, {
    method: "POST",
  });
}

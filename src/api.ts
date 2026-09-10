import type { RefreshResult, SourceInfo } from "./types";

const BASE = import.meta.env.VITE_API_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const resp = await fetch(`${BASE}${path}`, init);
  if (!resp.ok) {
    throw new Error(`${resp.status} ${resp.statusText}`);
  }
  return resp.json() as Promise<T>;
}

export function getSources(): Promise<SourceInfo[]> {
  return request<SourceInfo[]>("/api/sources");
}

export function refreshSource(key: string): Promise<RefreshResult> {
  return request<RefreshResult>(`/api/refresh/${key}`, { method: "POST" });
}

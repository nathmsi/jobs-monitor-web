import { jobId } from "../../utils/jobId";
import type { SavedItem } from "./SavedJobsContext";

const LOCAL_KEY = "savedJobs.local.v1";

export function loadLocal(): Map<string, SavedItem> {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    const arr = raw ? (JSON.parse(raw) as SavedItem[]) : [];
    return new Map(arr.map((it) => [jobId(it.source, it.external_id), it]));
  } catch {
    return new Map();
  }
}

export function saveLocal(map: Map<string, SavedItem>): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify([...map.values()]));
  } catch {
    /* ignore */
  }
}

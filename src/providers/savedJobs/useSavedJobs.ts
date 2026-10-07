import { useContext } from "react";

import { SavedJobsContext, type SavedJobsValue } from "./SavedJobsContext";

export function useSavedJobs(): SavedJobsValue {
  const ctx = useContext(SavedJobsContext);
  if (!ctx) throw new Error("useSavedJobs must be used within SavedJobsProvider");
  return ctx;
}

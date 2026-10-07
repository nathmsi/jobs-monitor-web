import { useContext } from "react";

import { JobFlagsContext, type JobFlags } from "./JobFlagsContext";

export function useJobFlags(): JobFlags {
  const ctx = useContext(JobFlagsContext);
  if (!ctx) throw new Error("useJobFlags must be used within JobFlagsProvider");
  return ctx;
}

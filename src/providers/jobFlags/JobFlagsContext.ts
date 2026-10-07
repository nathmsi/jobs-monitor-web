import { createContext } from "react";

export interface JobFlags {
  isOpened: (id: string) => boolean;
  markOpened: (id: string) => void;
  hideSeen: boolean;
  setHideSeen: (v: boolean) => void;
}

export const JobFlagsContext = createContext<JobFlags | null>(null);

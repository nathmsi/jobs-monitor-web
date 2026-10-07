import { createContext } from "react";

import type { CvProfile } from "../../utils/cvAnalysis";

export interface ProfileValue {
  ready: boolean;
  profile: CvProfile | null;
  saveProfile: (p: CvProfile) => void;
  clearProfile: () => void;
}

export const ProfileContext = createContext<ProfileValue | null>(null);

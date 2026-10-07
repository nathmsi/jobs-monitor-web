import { normalizeProfile, type CvProfile } from "../../utils/cvAnalysis";

export const PROFILE_LOCAL_KEY = "cvProfile.local.v1";

export function loadLocalProfile(): CvProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_LOCAL_KEY);
    return raw ? normalizeProfile(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

import type { JobPreferences } from "./PreferencesContext";

export const DEFAULT_PREFERENCES: JobPreferences = {
  region: "all",
  kind: "all",
  roles: [],
  categories: [],
};

const LOCAL_KEY = "jobPreferences.v1";

/** Coerce stored/remote data into valid preferences (lists are always arrays). */
export function mergePrefs(raw: Partial<JobPreferences>): JobPreferences {
  return {
    ...DEFAULT_PREFERENCES,
    ...raw,
    roles: Array.isArray(raw.roles) ? raw.roles : DEFAULT_PREFERENCES.roles,
    categories: Array.isArray(raw.categories) ? raw.categories : DEFAULT_PREFERENCES.categories,
  };
}

export function loadLocalPrefs(): JobPreferences {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? mergePrefs(JSON.parse(raw) as Partial<JobPreferences>) : DEFAULT_PREFERENCES;
  } catch {
    return DEFAULT_PREFERENCES;
  }
}

export function persistLocalPrefs(p: JobPreferences): void {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

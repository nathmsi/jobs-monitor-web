import { createContext } from "react";

export interface JobPreferences {
  region: string;
  kind: "all" | "company" | "agency";
  roles: string[];
  categories: string[];
}

export interface PreferencesValue {
  prefs: JobPreferences;
  savePrefs: (p: JobPreferences) => Promise<void>;
}

export const PreferencesContext = createContext<PreferencesValue | null>(null);

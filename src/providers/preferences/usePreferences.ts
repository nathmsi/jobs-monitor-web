import { useContext } from "react";

import { PreferencesContext, type PreferencesValue } from "./PreferencesContext";

export function usePreferences(): PreferencesValue {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error("usePreferences must be used inside PreferencesProvider");
  return ctx;
}

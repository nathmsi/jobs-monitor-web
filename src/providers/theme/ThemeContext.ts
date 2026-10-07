import { createContext } from "react";

// App theme, applied globally on <html data-theme>. "system" removes the
// attribute so the OS preference (prefers-color-scheme) drives the palette.

export type Theme = "system" | "light" | "dark";

export const THEME_STORAGE_KEY = "theme";
export const THEMES: Theme[] = ["system", "light", "dark"];
export const THEME_ICONS: Record<Theme, string> = {
  system: "🖥️",
  light: "☀️",
  dark: "🌙",
};

export interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

export const ThemeContext = createContext<ThemeValue | null>(null);

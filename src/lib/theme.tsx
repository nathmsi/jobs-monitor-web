import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

// App theme, applied globally on <html data-theme>. "system" removes the
// attribute so the OS preference (prefers-color-scheme) drives the palette.
// Kept at the app root so the theme applies on every route, independent of any
// particular header control.

export type Theme = "system" | "light" | "dark";

const KEY = "theme";
export const THEMES: Theme[] = ["system", "light", "dark"];
export const THEME_ICONS: Record<Theme, string> = {
  system: "🖥️",
  light: "☀️",
  dark: "🌙",
};

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

interface ThemeValue {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const Ctx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const value = useMemo<ThemeValue>(() => ({ theme, setTheme }), [theme]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTheme(): ThemeValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

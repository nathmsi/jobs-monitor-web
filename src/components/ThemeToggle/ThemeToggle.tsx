import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import styles from "./ThemeToggle.module.css";

type Theme = "system" | "light" | "dark";

const KEY = "theme";
const ORDER: Theme[] = ["system", "light", "dark"];
const ICONS: Record<Theme, string> = { system: "🖥️", light: "☀️", dark: "🌙" };

function read(): Theme {
  try {
    const v = localStorage.getItem(KEY);
    if (v === "light" || v === "dark" || v === "system") return v;
  } catch {
    /* ignore */
  }
  return "system";
}

/** Reflect the chosen theme on <html data-theme> (unset = follow the OS). */
function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);
}

export function ThemeToggle() {
  const { t } = useTranslation();
  const [theme, setTheme] = useState<Theme>(read);

  useEffect(() => {
    apply(theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const next = () => setTheme(ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length]);

  return (
    <button
      type="button"
      className={styles.toggle}
      onClick={next}
      title={t(`theme.${theme}`)}
      aria-label={t(`theme.${theme}`)}
    >
      <span aria-hidden>{ICONS[theme]}</span>
      <span className={styles.label}>{t(`theme.${theme}`)}</span>
    </button>
  );
}

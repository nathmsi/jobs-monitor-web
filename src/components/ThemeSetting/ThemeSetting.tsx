import { useTranslation } from "react-i18next";

import { THEMES, type Theme } from "../../providers/theme/ThemeContext";
import { useTheme } from "../../providers/theme/useTheme";
import styles from "./ThemeSetting.module.css";

const svg = (children: React.ReactNode) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {children}
  </svg>
);

const THEME_SVG: Record<Theme, React.ReactNode> = {
  system: svg(<><rect x="2" y="3" width="20" height="14" rx="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>),
  light: svg(<><circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.2" y1="4.2" x2="5.6" y2="5.6" /><line x1="18.4" y1="18.4" x2="19.8" y2="19.8" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.2" y1="19.8" x2="5.6" y2="18.4" /><line x1="18.4" y1="5.6" x2="19.8" y2="4.2" /></>),
  dark: svg(<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z" />),
};

/** Segmented System / Light / Dark control, used in the profile settings. */
export function ThemeSetting() {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();

  return (
    <div className={styles.group} role="radiogroup" aria-label={t("profile.theme")}>
      {THEMES.map((opt) => {
        const active = theme === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={active}
            className={`${styles.opt} ${active ? styles.optOn : ""}`}
            onClick={() => setTheme(opt)}
          >
            <span aria-hidden>{THEME_SVG[opt]}</span>
            <span>{t(`theme.${opt}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

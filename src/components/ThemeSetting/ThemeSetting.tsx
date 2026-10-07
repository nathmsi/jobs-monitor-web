import { useTranslation } from "react-i18next";

import { THEME_ICONS, THEMES } from "../../providers/theme/ThemeContext";
import { useTheme } from "../../providers/theme/useTheme";
import styles from "./ThemeSetting.module.css";

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
            <span aria-hidden>{THEME_ICONS[opt]}</span>
            <span>{t(`theme.${opt}`)}</span>
          </button>
        );
      })}
    </div>
  );
}

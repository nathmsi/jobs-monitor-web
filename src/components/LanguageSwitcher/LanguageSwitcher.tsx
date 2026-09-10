import { useTranslation } from "react-i18next";

import { SUPPORTED_LANGUAGES } from "../../i18n";
import styles from "./LanguageSwitcher.module.css";

export function LanguageSwitcher() {
  const { i18n, t } = useTranslation();
  const current = i18n.resolvedLanguage ?? i18n.language;

  return (
    <div className={styles.switch} role="group" aria-label={t("lang.label")}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          className={`${styles.option} ${current === lng ? styles.active : ""}`}
          aria-pressed={current === lng}
          onClick={() => i18n.changeLanguage(lng)}
        >
          {t(`lang.${lng}`)}
        </button>
      ))}
    </div>
  );
}

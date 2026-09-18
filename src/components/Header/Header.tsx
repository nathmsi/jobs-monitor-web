import { useTranslation } from "react-i18next";

import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { ThemeToggle } from "../ThemeToggle/ThemeToggle";
import styles from "./Header.module.css";

export function Header() {
  const { t } = useTranslation();

  return (
    <header className={styles.header}>
      <div className={styles.topbar}>
        <ThemeToggle />
        <LanguageSwitcher />
      </div>
      <div className={styles.hero}>
        <div className={styles.badge}>{t("header.eyebrow")}</div>
        <h1 className={styles.title}>{t("header.title")}</h1>
        <p className={styles.subtitle}>{t("header.subtitle")}</p>
      </div>
    </header>
  );
}

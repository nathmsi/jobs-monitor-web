import { useTranslation } from "react-i18next";

import styles from "./PageFallback.module.css";

/** Shown while a lazy route chunk is loading. */
export function PageFallback() {
  const { t } = useTranslation();
  return (
    <div className={styles.box} role="status" aria-live="polite">
      <span className={styles.spinner} aria-hidden="true" />
      <span className={styles.label}>{t("common.loading")}</span>
    </div>
  );
}

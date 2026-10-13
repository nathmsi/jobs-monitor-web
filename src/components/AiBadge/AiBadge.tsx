import { useTranslation } from "react-i18next";

import { SparkleIcon } from "../Icons/Icons";
import styles from "./AiBadge.module.css";

/** Small "AI" pill: marks every entry point to the AI features. `decorative` hides it from screen readers when the link text already says it. */
export function AiBadge({ className = "", decorative = false }: { className?: string; decorative?: boolean }) {
  const { t } = useTranslation();
  return (
    <span className={`${styles.badge} ${className}`} data-testid="ai-badge" aria-hidden={decorative || undefined}>
      <SparkleIcon size={10} strokeWidth={2.4} />
      {t("ai.badge")}
    </span>
  );
}

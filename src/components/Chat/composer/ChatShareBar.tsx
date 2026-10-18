import { useId } from "react";
import { useTranslation } from "react-i18next";

import type { ChatShareController } from "../../../hooks/useChatShare";
import styles from "./ChatShareBar.module.css";

interface Props {
  share: ChatShareController;
}

/**
 * Above the message box: the switch that lets the assistant use the user's CV and profile, and
 * what happened to a CV they just attached. Nothing is shown until there is something to share.
 */
export function ChatShareBar({ share }: Props) {
  const { t } = useTranslation();
  const hintId = useId();
  const { available, enabled, setEnabled, skillCount, cvCount, attaching, error, notice } = share;

  if (!available && !attaching && !error && !notice) return null;

  return (
    <div className={styles.bar}>
      {attaching && (
        <p className={styles.line} role="status">
          {t("chat.attaching")}
        </p>
      )}
      {error && (
        <p className={`${styles.line} ${styles.error}`} role="alert">
          {error}
        </p>
      )}
      {notice && !error && (
        <p className={styles.line} role="status">
          {notice}
        </p>
      )}

      {available && (
        <div className={styles.row}>
          <button
            type="button"
            role="switch"
            aria-checked={enabled}
            aria-describedby={hintId}
            className={`${styles.switch} ${enabled ? styles.on : ""}`}
            onClick={() => setEnabled(!enabled)}
          >
            <span className={styles.track} aria-hidden="true">
              <span className={styles.thumb} />
            </span>
            <span className={styles.label}>{t("chat.useCv")}</span>
          </button>
          <span className={styles.counts}>
            {[skillCount > 0 ? t("chat.shareSkills", { count: skillCount }) : "", cvCount > 0 ? t("chat.shareCvs", { count: cvCount }) : ""]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </div>
      )}
      {available && (
        <p id={hintId} className={`${styles.hint} ${enabled ? styles.hintOn : styles.hintOff}`}>
          {enabled ? t("chat.shareOn") : t("chat.shareOff")}
        </p>
      )}
    </div>
  );
}

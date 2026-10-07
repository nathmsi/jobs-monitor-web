import { useTranslation } from "react-i18next";
import { useLocation } from "react-router-dom";

import { useProfile } from "../../providers/profile/useProfile";
import styles from "./ProfileButton.module.css";

interface Props {
  onClick: () => void;
}

export function ProfileButton({ onClick }: Props) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { pathname } = useLocation();
  const count = profile?.skills.length ?? 0;
  const active = pathname === "/profile";

  return (
    <button
      type="button"
      className={`${styles.btn} ${active ? styles.btnActive : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <svg
        viewBox="0 0 24 24"
        width="16"
        height="16"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="8" r="3.2" />
        <path d="M5 20c0-3.3 3.1-6 7-6s7 2.7 7 6" />
      </svg>
      <span className={styles.label}>{t("profile.open")}</span>
      {count > 0 && <span className={styles.count}>{count}</span>}
    </button>
  );
}

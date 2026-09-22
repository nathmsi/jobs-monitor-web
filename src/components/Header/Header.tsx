import { useTranslation } from "react-i18next";
import { Link, useNavigate } from "react-router-dom";

import { AuthButton } from "../AuthButton/AuthButton";
import { LanguageSwitcher } from "../LanguageSwitcher/LanguageSwitcher";
import { ProfileButton } from "../ProfileButton/ProfileButton";
import styles from "./Header.module.css";

export function Header() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.brand}>
        <svg
          className={styles.logo}
          viewBox="0 0 48 48"
          width="40"
          height="40"
          aria-hidden
        >
          <defs>
            <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#logoBg)" />
          <circle cx="21" cy="21" r="8.5" fill="none" stroke="#fff" strokeWidth="3" />
          <line
            x1="27.2"
            y1="27.2"
            x2="34"
            y2="34"
            stroke="#fff"
            strokeWidth="3.6"
            strokeLinecap="round"
          />
          <circle cx="32.5" cy="14" r="4.6" fill="#fbbf24" stroke="url(#logoBg)" strokeWidth="2" />
        </svg>
        <div className={styles.brandText}>
          <span className={styles.name}>{t("header.title")}</span>
          <span className={styles.tagline}>{t("header.subtitle")}</span>
        </div>
      </Link>

      <div className={styles.actions}>
        <LanguageSwitcher />
        <Link to="/coach" className={styles.coachLink}>
          ✨ <span className={styles.coachLabel}>{t("coach.nav")}</span>
        </Link>
        <AuthButton />
        <ProfileButton onClick={() => navigate("/profile")} />
      </div>
    </header>
  );
}

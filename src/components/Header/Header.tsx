import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../lib/auth";
import { useTheme } from "../../lib/theme";
import { SUPPORTED_LANGUAGES } from "../../i18n";
import styles from "./Header.module.css";

export function Header() {
  const { t, i18n } = useTranslation();
  const { enabled, ready, user, signInWithGoogle, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  const currentLang = i18n.resolvedLanguage ?? i18n.language;
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const navClass = ({ isActive }: { isActive: boolean }) =>
    `${styles.navLink} ${isActive ? styles.navLinkActive : ""}`;

  return (
    <header className={styles.header}>
      {/* Brand */}
      <Link to="/" className={styles.brand}>
        <svg className={styles.logo} viewBox="0 0 48 48" width="32" height="32" aria-hidden>
          <defs>
            <linearGradient id="logoBg" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#6366f1" />
            </linearGradient>
          </defs>
          <rect x="2" y="2" width="44" height="44" rx="11" fill="url(#logoBg)" />
          <circle cx="21" cy="21" r="8.5" fill="none" stroke="#fff" strokeWidth="3" />
          <line x1="27.2" y1="27.2" x2="34" y2="34" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" />
          <circle cx="32.5" cy="14" r="4.6" fill="#fbbf24" stroke="url(#logoBg)" strokeWidth="2" />
        </svg>
        <span className={styles.brandName}>Tech Jobs</span>
      </Link>

      {/* Navigation */}
      <nav className={styles.nav} aria-label="Main navigation">
        <NavLink to="/" end className={navClass}>{t("nav.offers")}</NavLink>
        <NavLink to="/coach" className={navClass}>{t("nav.cvAnalysis")}</NavLink>
        <NavLink to="/profile" className={navClass}>{t("nav.profile")}</NavLink>
      </nav>

      {/* Actions */}
      <div className={styles.actions}>
        {/* Dark/light toggle */}
        <button
          type="button"
          className={styles.themeBtn}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          title={isDark ? "Switch to light" : "Switch to dark"}
        >
          {isDark ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
            </svg>
          )}
        </button>

        {/* Language dropdown */}
        <div className={styles.langDropdown}>
          <button
            type="button"
            className={styles.langTrigger}
            onClick={() => setLangOpen((v) => !v)}
            aria-expanded={langOpen}
          >
            {t(`lang.${currentLang}`)}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden className={langOpen ? styles.chevronUp : ""}>
              <path d="M1.5 3L5 6.5L8.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {langOpen && (
            <>
              <div className={styles.langBackdrop} onClick={() => setLangOpen(false)} />
              <div className={styles.langMenu}>
                {SUPPORTED_LANGUAGES.map((lng) => (
                  <button
                    key={lng}
                    type="button"
                    className={`${styles.langOption} ${currentLang === lng ? styles.langOptionActive : ""}`}
                    onClick={() => { i18n.changeLanguage(lng); setLangOpen(false); }}
                  >
                    {t(`lang.${lng}`)}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {enabled && ready && (
          <>
            {!user ? (
              <button
                type="button"
                className={styles.signInBtn}
                onClick={() => signInWithGoogle()}
              >
                Sign in
              </button>
            ) : (
              <div className={styles.userMenu}>
                <button
                  type="button"
                  className={styles.avatarBtn}
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                >
                  {user.user_metadata?.avatar_url ? (
                    <img
                      className={styles.avatar}
                      src={user.user_metadata.avatar_url as string}
                      alt=""
                    />
                  ) : (
                    <span className={styles.avatarFallback}>
                      {((user.user_metadata?.name as string) || user.email || "?").charAt(0).toUpperCase()}
                    </span>
                  )}
                </button>

                {menuOpen && (
                  <>
                    <div className={styles.menuBackdrop} onClick={() => setMenuOpen(false)} />
                    <div className={styles.dropdown}>
                      <div className={styles.dropdownUser}>
                        <span className={styles.dropdownName}>
                          {(user.user_metadata?.name as string) || user.email}
                        </span>
                        <span className={styles.dropdownEmail}>{user.email}</span>
                      </div>

                      <div className={styles.dropdownDivider} />

                      <button
                        type="button"
                        className={styles.signOutBtn}
                        onClick={() => { setMenuOpen(false); signOut(); }}
                      >
                        {t("auth.signOut")}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </header>
  );
}

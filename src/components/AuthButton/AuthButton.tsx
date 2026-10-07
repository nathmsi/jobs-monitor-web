import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../providers/auth/useAuth";
import styles from "./AuthButton.module.css";

/** Official multicolor Google "G" mark. */
function GoogleIcon() {
  return (
    <svg
      className={styles.gIcon}
      width="18"
      height="18"
      viewBox="0 0 18 18"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
      />
      <path
        fill="#FBBC05"
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
      />
    </svg>
  );
}

export function AuthButton() {
  const { t } = useTranslation();
  const { enabled, ready, user, signInWithGoogle, signOut } = useAuth();
  const [open, setOpen] = useState(false);

  // Hide entirely until Supabase is configured.
  if (!enabled) return null;
  if (!ready) return <span className={styles.placeholder} aria-hidden />;

  if (!user) {
    return (
      <button
        type="button"
        className={styles.signIn}
        onClick={() => signInWithGoogle()}
        title={t("auth.signInGoogle")}
      >
        <GoogleIcon />
        <span className={styles.signInLabel}>{t("auth.signInGoogle")}</span>
      </button>
    );
  }

  const name =
    (user.user_metadata?.full_name as string) ||
    (user.user_metadata?.name as string) ||
    user.email ||
    "";
  const avatar = user.user_metadata?.avatar_url as string | undefined;
  const initial = (name || "?").charAt(0).toUpperCase();

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.userBtn}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        {avatar ? (
          <img className={styles.avatar} src={avatar} alt="" />
        ) : (
          <span className={styles.avatarFallback}>{initial}</span>
        )}
        <span className={styles.name}>{name}</span>
      </button>
      {open && (
        <div className={styles.menu}>
          <button
            type="button"
            className={styles.signOut}
            onClick={() => {
              setOpen(false);
              signOut();
            }}
          >
            {t("auth.signOut")}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../lib/auth";
import styles from "./AuthButton.module.css";

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
      >
        <span aria-hidden>🔒</span> {t("auth.signInGoogle")}
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

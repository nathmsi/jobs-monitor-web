import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../lib/auth";
import { useSavedJobs, type SavedStatus } from "../../lib/savedJobs";
import styles from "./MyJobs.module.css";

type Tab = "all" | "saved" | "applied";

export function MyJobs() {
  const { t } = useTranslation();
  const { enabled, user, signInWithGoogle } = useAuth();
  const { items, changeStatus, savedCount, appliedCount } = useSavedJobs();
  const [tab, setTab] = useState<Tab>("all");

  const shown = items
    .filter((it) => (tab === "all" ? true : it.status === tab))
    .sort((a, b) => (a.company ?? "").localeCompare(b.company ?? ""));

  return (
    <div className={styles.wrap}>
      {enabled && !user && (
        <div className={styles.signInHint}>
          {t("mine.signInHint")}{" "}
          <button className={styles.hintBtn} onClick={() => signInWithGoogle()}>
            {t("auth.signInGoogle")}
          </button>
        </div>
      )}

      <div className={styles.tabs} role="tablist">
        {(["all", "saved", "applied"] as Tab[]).map((key) => {
          const count =
            key === "all"
              ? items.length
              : key === "saved"
                ? savedCount
                : appliedCount;
          return (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              className={`${styles.tab} ${tab === key ? styles.tabActive : ""}`}
              onClick={() => setTab(key)}
            >
              {t(`mine.${key}`)} <span className={styles.count}>{count}</span>
            </button>
          );
        })}
      </div>

      {shown.length === 0 ? (
        <p className={styles.empty}>{t("mine.empty")}</p>
      ) : (
        <ul className={styles.list}>
          {shown.map((it) => (
            <li key={`${it.source}-${it.external_id}`} className={styles.item}>
              <div className={styles.info}>
                <span
                  className={`${styles.pill} ${
                    it.status === "applied" ? styles.pillApplied : styles.pillSaved
                  }`}
                >
                  {it.status === "applied" ? (
                    <>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
                      {t("job.applied")}
                    </>
                  ) : (
                    <>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
                      {t("job.saved")}
                    </>
                  )}
                </span>
                <div className={styles.text}>
                  <span className={styles.title} dir="auto">
                    {it.url ? (
                      <a href={it.url} target="_blank" rel="noreferrer">
                        {it.title || t("mine.untitled")}
                      </a>
                    ) : (
                      it.title || t("mine.untitled")
                    )}
                  </span>
                  <span className={styles.meta} dir="auto">
                    {[it.company, it.location].filter(Boolean).join(" · ")}
                  </span>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() =>
                    changeStatus(
                      it,
                      (it.status === "applied" ? "saved" : "applied") as SavedStatus,
                    )
                  }
                >
                  {it.status === "applied" ? t("mine.markSaved") : t("job.markApplied")}
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => changeStatus(it, null)}
                  aria-label={t("mine.remove")}
                  title={t("mine.remove")}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

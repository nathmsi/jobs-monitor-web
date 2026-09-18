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
                  {it.status === "applied" ? `✓ ${t("job.applied")}` : `★ ${t("job.saved")}`}
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
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

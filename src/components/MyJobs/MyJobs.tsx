import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAuth } from "../../providers/auth/useAuth";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import { type SavedItem, type SavedStatus } from "../../providers/savedJobs/SavedJobsContext";
import { useToast } from "../../providers/toast/useToast";
import { CheckIcon, CloseIcon } from "../Icons/Icons";
import styles from "./MyJobs.module.css";

type Tab = "all" | "saved" | "applied";

export function MyJobs() {
  const { t } = useTranslation();
  const { enabled, user, signInWithGoogle } = useAuth();
  const { items, changeStatus, savedCount, appliedCount } = useSavedJobs();
  const { showToast } = useToast();

  const update = async (it: SavedItem, status: SavedStatus | null) => {
    if (!(await changeStatus(it, status))) showToast(t("job.saveError"));
  };
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
                      <CheckIcon size={10} strokeWidth={2.8} />
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
                    update(it, (it.status === "applied" ? "saved" : "applied") as SavedStatus)
                  }
                >
                  {it.status === "applied" ? t("mine.markSaved") : t("job.markApplied")}
                </button>
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => update(it, null)}
                  aria-label={t("mine.remove")}
                  title={t("mine.remove")}
                >
                  <CloseIcon size={13} strokeWidth={2.5} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

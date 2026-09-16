import { useState } from "react";
import { useTranslation } from "react-i18next";

import type { Job, SourceInfo } from "../../types";
import { Avatar } from "../Avatar/Avatar";
import { JobCard } from "../JobCard/JobCard";
import styles from "./SourceSection.module.css";

interface Props {
  source: SourceInfo;
  jobs: Job[];
}

export function SourceSection({ source, jobs }: Props) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const bodyId = `source-body-${source.key}`;
  const count = jobs.length;
  const newCount = jobs.filter((j) => j.is_new).length;

  return (
    <section
      className={styles.section}
      style={open ? { gridColumn: "1 / -1" } : undefined}
    >
      <button
        className={`${styles.card} ${open ? styles.cardOpen : ""}`}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls={bodyId}
      >
        <Avatar source={source} size={42} />
        <span className={styles.titleGroup}>
          <span className={styles.title}>{source.label}</span>
          <span className={styles.meta}>
            {t("source.offers", { count })}
            {newCount > 0 && (
              <>
                {" · "}
                <strong className={styles.metaNew}>
                  {t("source.new", { count: newCount })}
                </strong>
              </>
            )}
          </span>
        </span>
        {count > 0 && <span className={styles.countPill}>{count}</span>}
        <span
          className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
          aria-hidden
        >
          ▸
        </span>
      </button>

      {open && (
        <div id={bodyId} className={styles.body}>
          {source.site_url && (
            <div className={styles.toolbar}>
              <a
                className={styles.ghostBtn}
                href={source.site_url}
                target="_blank"
                rel="noreferrer"
              >
                {t("source.openSite")}
              </a>
            </div>
          )}
          <div className={styles.grid}>
            {jobs.map((job) => (
              <JobCard key={`${job.source}-${job.external_id}`} job={job} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

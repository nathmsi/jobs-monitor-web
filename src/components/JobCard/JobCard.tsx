import { useTranslation } from "react-i18next";

import { Badge } from "../Badge/Badge";
import type { Job } from "../../types";
import styles from "./JobCard.module.css";

interface Props {
  job: Job;
}

export function JobCard({ job }: Props) {
  const { t } = useTranslation();
  return (
    <article className={`${styles.card} ${job.is_new ? styles.isNew : ""}`}>
      <header className={styles.head}>
        <span className={styles.id}>#{job.external_id}</span>
        <div className={styles.badges}>
          {job.is_new && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && <Badge variant="hot">🔥 {t("job.hot")}</Badge>}
        </div>
      </header>

      <h3 className={styles.title} dir="auto">
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer">
            {job.title}
          </a>
        ) : (
          job.title
        )}
      </h3>

      {job.location && (
        <p className={styles.location} dir="auto">
          <span aria-hidden>📍</span> {job.location}
        </p>
      )}

      {job.excerpt && (
        <p className={styles.excerpt} dir="auto">
          {job.excerpt}
        </p>
      )}

      <footer className={styles.foot}>
        {job.last_updated && <span className={styles.date}>{job.last_updated}</span>}
        {job.url && (
          <a className={styles.link} href={job.url} target="_blank" rel="noreferrer">
            {t("job.view")}
          </a>
        )}
      </footer>
    </article>
  );
}

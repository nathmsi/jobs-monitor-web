import { useTranslation } from "react-i18next";

import { jobId, useJobFlags } from "../../lib/jobFlags";
import { useSavedJobs } from "../../lib/savedJobs";
import { Badge } from "../Badge/Badge";
import type { Job } from "../../types";
import styles from "./JobCard.module.css";

interface Props {
  job: Job;
  sourceLabel?: string;
}

export function JobCard({ job, sourceLabel }: Props) {
  const { t } = useTranslation();
  const { isOpened, markOpened } = useJobFlags();
  const { statusOf, setStatus } = useSavedJobs();

  const id = jobId(job.source, job.external_id);
  const opened = isOpened(id);
  const status = statusOf(job.source, job.external_id);
  const saved = status !== undefined;
  const applied = status === "applied";

  const cardClass = [
    styles.card,
    job.is_new ? styles.isNew : "",
    opened ? styles.opened : "",
    applied ? styles.applied : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className={cardClass}>
      <header className={styles.head}>
        <span className={styles.id}>#{job.external_id}</span>
        <div className={styles.badges}>
          {applied && <Badge variant="applied">✓ {t("job.applied")}</Badge>}
          {!applied && opened && (
            <span className={styles.seenTag}>{t("job.seen")}</span>
          )}
          {job.is_new && !opened && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && <Badge variant="hot">🔥 {t("job.hot")}</Badge>}
        </div>
      </header>

      <h3 className={styles.title} dir="auto">
        {job.url ? (
          <a
            href={job.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => markOpened(id)}
          >
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
        <button
          type="button"
          className={`${styles.saveBtn} ${saved ? styles.saveBtnOn : ""}`}
          onClick={() => setStatus(job, saved ? null : "saved", sourceLabel)}
          aria-pressed={saved}
          title={saved ? t("job.unsave") : t("job.save")}
        >
          {saved ? "★" : "☆"} {saved ? t("job.saved") : t("job.save")}
        </button>
        <button
          type="button"
          className={`${styles.applyBtn} ${applied ? styles.applyBtnOn : ""}`}
          onClick={() => setStatus(job, applied ? "saved" : "applied", sourceLabel)}
          aria-pressed={applied}
        >
          {applied ? `✓ ${t("job.applied")}` : t("job.markApplied")}
        </button>
        {job.url && (
          <a
            className={styles.link}
            href={job.url}
            target="_blank"
            rel="noreferrer"
            onClick={() => markOpened(id)}
          >
            {t("job.view")}
          </a>
        )}
      </footer>
    </article>
  );
}

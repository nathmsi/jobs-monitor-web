import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useToast } from "../../providers/toast/useToast";

import { parseAiSummary } from "../../utils/aiSummary";
import { matchScore } from "../../utils/cvAnalysis";
import { jobId } from "../../utils/jobId";
import { useJobFlags } from "../../providers/jobFlags/useJobFlags";
import { jobText } from "../../utils/jobText";
import { useProfile } from "../../providers/profile/useProfile";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import type { Job, SourceInfo } from "../../types";
import { AlertCircleIcon, BookmarkIcon, CheckIcon } from "../Icons/Icons";
import styles from "./JobCard.module.css";

interface Props {
  job: Job;
  source?: SourceInfo;
}

export const JobCard = memo(function JobCard({ job, source }: Props) {
  const { t } = useTranslation();
  const { showToast } = useToast();
  const { isOpened, markOpened } = useJobFlags();
  const { statusOf, setStatus } = useSavedJobs();
  const { profile } = useProfile();

  const id = jobId(job.source, job.external_id);
  const opened = isOpened(id);
  const status = statusOf(job.source, job.external_id);
  const saved = status !== undefined;
  const applied = status === "applied";

  const ai = useMemo(() => parseAiSummary(job.ai_summary), [job.ai_summary]);
  const match = useMemo(() => matchScore(jobText(job), profile), [job, profile]);
  const rawDesc = job.description || job.excerpt || "";

  const isExpired = job.is_expired;

  const cardClass = [
    styles.card,
    job.is_new ? styles.isNew : "",
    opened ? styles.opened : "",
    applied ? styles.applied : "",
    isExpired ? styles.expired : "",
  ].filter(Boolean).join(" ");

  return (
    <article className={cardClass}>

      {/* ── Top bar: company + badges ── */}
      <div className={styles.topBar}>
        <div className={styles.company}>
          {source && <Avatar source={source} size={32} />}
          <span className={styles.companyName}>{source?.label ?? job.source}</span>
        </div>
        <div className={styles.badgeRow}>
          {isExpired && (
            <Badge variant="expired">
              <AlertCircleIcon size={9} strokeWidth={2.5} />
              {t("job.expired")}
            </Badge>
          )}
          {!isExpired && job.is_new && !opened && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && (
            <Badge variant="hot">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2C13.5 2 13 7 10 9.5 9 10 8 10.5 7 11c-2 1.5-3 4-2.5 6.5C5 20.5 7.5 23 11 23c4 0 7-3 7-7 0-2.5-1.5-4.5-3-5.5-1 2-2.5 3.5-4 4.5 1.5-3 2.5-9 2.5-13z"/></svg>
              {t("job.hot")}
            </Badge>
          )}
          {applied && (
            <Badge variant="applied">
              <CheckIcon size={10} strokeWidth={2.8} />
              {t("job.applied")}
            </Badge>
          )}
          {!applied && opened && <span className={styles.seenDot} title={t("job.seen")} />}
        </div>
      </div>

      {/* ── Title ── */}
      <h3 className={styles.title} dir="auto">
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer" onClick={() => markOpened(id)}>
            {job.title}
          </a>
        ) : job.title}
      </h3>

      {/* ── Meta row ── */}
      <div className={styles.metaRow}>
        {job.location && (
          <span className={styles.location}>
            <svg width="10" height="12" viewBox="0 0 10 12" fill="none" aria-hidden>
              <path d="M5 0C2.8 0 1 1.8 1 4c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4zm0 5.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z" fill="currentColor"/>
            </svg>
            {job.location.split(",")[0]}
          </span>
        )}
        {ai?.level && (
          <span className={styles.levelBadge} data-level={ai.level.toLowerCase()}>
            {ai.level}
          </span>
        )}
        {ai?.remote && ai.remote !== "On-site" && (
          <span className={styles.remoteBadge}>
            {ai.remote === "Remote" ? t("job.remote") : t("job.hybrid")}
          </span>
        )}
      </div>

      {/* ── AI or fallback description ── */}
      {ai ? (
        <div className={styles.aiSection}>
          <p className={styles.aiHeadline}>{ai.headline}</p>

          {ai.stack.length > 0 && (
            <div className={styles.stack}>
              {ai.stack.slice(0, 6).map((s) => (
                <span key={s} className={styles.chip}>{s}</span>
              ))}
            </div>
          )}

          {ai.highlights.length > 0 && (
            <div className={styles.highlights}>
              {ai.highlights.map((h) => (
                <span key={h} className={styles.highlight}>{h}</span>
              ))}
            </div>
          )}
        </div>
      ) : rawDesc ? (
        <p className={styles.excerpt}>{rawDesc.slice(0, 140)}{rawDesc.length > 140 ? "…" : ""}</p>
      ) : null}

      {/* ── Match bar ── */}
      {match.count > 0 && (
        <div className={styles.matchBar} title={match.matched.join(", ")}>
          <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor" aria-hidden>
            <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.25L2.75 10.5L3.75 6.75L1 4.5H4.5L6 1Z"/>
          </svg>
          {t("match.skills", { count: match.count })} — {match.matched.slice(0, 3).join(", ")}
        </div>
      )}

      {/* ── Actions ── */}
      <footer className={styles.foot}>
        <button
          type="button"
          className={`${styles.btn} ${saved ? styles.btnSavedOn : ""}`}
          onClick={async () => {
            const next = saved ? null : "saved";
            if (!(await setStatus(job, next, source?.label))) showToast(t("job.saveError"));
            else if (next === "saved") showToast(t("job.savedToast"));
          }}
          aria-pressed={saved}
        >
          <BookmarkIcon size={13} filled={saved} />
          {saved ? t("job.saved") : t("job.save")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${applied ? styles.btnAppliedOn : ""}`}
          onClick={async () => {
            const next = applied ? "saved" : "applied";
            if (!(await setStatus(job, next, source?.label))) showToast(t("job.saveError"));
            else if (next === "applied") showToast(t("job.appliedToast"));
          }}
          aria-pressed={applied}
        >
          {applied && <CheckIcon size={12} strokeWidth={2.8} />}
          {applied ? t("job.applied") : t("job.markApplied")}
        </button>
        {job.url && (
          <a
            className={styles.viewLink}
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
});

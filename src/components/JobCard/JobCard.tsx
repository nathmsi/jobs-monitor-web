import { memo, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { useJobFlags } from "../../providers/jobFlags/useJobFlags";
import { useProfile } from "../../providers/profile/useProfile";
import { useSavedJobs } from "../../providers/savedJobs/useSavedJobs";
import { useToast } from "../../providers/toast/useToast";
import type { Job, SourceInfo } from "../../types";
import { parseAiSummary } from "../../utils/aiSummary";
import { matchScore } from "../../utils/cvAnalysis";
import { jobId } from "../../utils/jobId";
import { jobText } from "../../utils/jobText";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import { AlertCircleIcon, BookmarkIcon, CheckIcon } from "../Icons/Icons";
import styles from "./JobCard.module.css";

interface Props {
  job: Job;
  source?: SourceInfo;
}

/** At most this many technologies are shown on a card. */
const MAX_STACK = 3;

/**
 * An offer, kept deliberately light: company, title, one line of summary, a
 * few tags, and two actions: open it, or bookmark it (and, once bookmarked,
 * mark it as applied).
 */
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
  const summary = ai?.headline || job.excerpt || job.description || "";

  const cardClass = [
    styles.card,
    job.is_new ? styles.isNew : "",
    opened ? styles.opened : "",
    applied ? styles.applied : "",
    job.is_expired ? styles.expired : "",
  ].filter(Boolean).join(" ");

  const change = async (next: "saved" | "applied" | null, toast?: string) => {
    if (!(await setStatus(job, next, source?.label))) showToast(t("job.saveError"));
    else if (toast) showToast(toast);
  };

  const remote = ai?.remote === "Remote" ? t("job.remote") : ai?.remote === "Hybrid" ? t("job.hybrid") : "";
  const place = job.location.split(",")[0];
  const stack = ai?.stack.slice(0, MAX_STACK) ?? [];
  const hasTags = Boolean(place || ai?.level || remote || stack.length || match.count > 0);

  return (
    <article className={cardClass}>
      <div className={styles.topBar}>
        <div className={styles.company}>
          {source && <Avatar source={source} size={28} />}
          <span className={styles.companyName}>{source?.label ?? job.source}</span>
          {opened && !applied && <span className={styles.seenDot} title={t("job.seen")} />}
        </div>
        <div className={styles.badgeRow}>
          {job.is_expired && (
            <Badge variant="expired">
              <AlertCircleIcon size={9} strokeWidth={2.5} />
              {t("job.expired")}
            </Badge>
          )}
          {!job.is_expired && job.is_new && !opened && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && <Badge variant="hot">{t("job.hot")}</Badge>}
          {applied && (
            <Badge variant="applied">
              <CheckIcon size={10} strokeWidth={2.8} />
              {t("job.applied")}
            </Badge>
          )}
          <button
            type="button"
            className={`${styles.saveBtn} ${saved ? styles.saveBtnOn : ""}`}
            onClick={() => change(saved ? null : "saved", saved ? undefined : t("job.savedToast"))}
            aria-pressed={saved}
            aria-label={saved ? t("job.saved") : t("job.save")}
            title={saved ? t("job.unsave") : t("job.save")}
          >
            <BookmarkIcon size={16} filled={saved} />
          </button>
        </div>
      </div>

      <h3 className={styles.title} dir="auto">
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer" onClick={() => markOpened(id)}>
            {job.title}
          </a>
        ) : job.title}
      </h3>

      {summary && <p className={styles.summary} dir="auto">{summary}</p>}

      {hasTags && (
        <ul className={styles.tags}>
          {place && <li className={styles.location}>{place}</li>}
          {ai?.level && (
            <li className={styles.levelBadge} data-level={ai.level.toLowerCase()}>{ai.level}</li>
          )}
          {remote && <li className={styles.remoteBadge}>{remote}</li>}
          {stack.map((s) => <li key={s} className={styles.chip}>{s}</li>)}
          {match.count > 0 && (
            <li className={styles.match} title={match.matched.join(", ")}>
              ★ {t("match.skills", { count: match.count })}
            </li>
          )}
        </ul>
      )}

      <footer className={styles.foot}>
        {saved && (
          <button
            type="button"
            className={`${styles.appliedBtn} ${applied ? styles.appliedBtnOn : ""}`}
            onClick={() =>
              change(applied ? "saved" : "applied", applied ? undefined : t("job.appliedToast"))
            }
            aria-pressed={applied}
          >
            {applied ? t("job.applied") : t("job.markApplied")}
          </button>
        )}
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

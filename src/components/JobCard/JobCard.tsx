import { useTranslation } from "react-i18next";

import { matchScore } from "../../lib/cvAnalysis";
import { jobId, useJobFlags } from "../../lib/jobFlags";
import { useProfile } from "../../lib/profile";
import { useSavedJobs } from "../../lib/savedJobs";
import { Avatar } from "../Avatar/Avatar";
import { Badge } from "../Badge/Badge";
import type { Job, SourceInfo } from "../../types";
import styles from "./JobCard.module.css";

interface AiInfo {
  headline: string;
  stack: string[];
  level: string;
  remote: string;
  highlights: string[];
}

function parseAiSummary(raw: string | undefined): AiInfo | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as AiInfo;
    if (parsed.headline) return parsed;
  } catch {}
  return null;
}

const LEVEL_COLOR: Record<string, string> = {
  Intern: "#6b7280", Junior: "#3b82f6", Mid: "#8b5cf6",
  Senior: "#f59e0b", Staff: "#ef4444", Lead: "#ef4444",
  Manager: "#10b981", Director: "#10b981",
};

interface Props {
  job: Job;
  source?: SourceInfo;
}

export function JobCard({ job, source }: Props) {
  const sourceLabel = source?.label;
  const { t } = useTranslation();
  const { isOpened, markOpened } = useJobFlags();
  const { statusOf, setStatus } = useSavedJobs();
  const { profile } = useProfile();

  const id = jobId(job.source, job.external_id);
  const opened = isOpened(id);
  const status = statusOf(job.source, job.external_id);
  const saved = status !== undefined;
  const applied = status === "applied";

  const ai = parseAiSummary(job.ai_summary);

  const match = matchScore(
    `${job.title} ${job.excerpt} ${job.description ?? ""}`,
    profile,
  );

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
        <span className={styles.origin} dir="auto">
          {source && <Avatar source={source} size={34} />}
          {sourceLabel && <span className={styles.source}>{sourceLabel}</span>}
        </span>
        <div className={styles.badges}>
          {match.count > 0 && (
            <span className={styles.matchTag} title={match.matched.join(", ")}>
              ★ {t("match.skills", { count: match.count })}
            </span>
          )}
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

      {ai ? (
        <div className={styles.aiBlock}>
          <p className={styles.aiHeadline} dir="auto">{ai.headline}</p>
          <div className={styles.aiMeta}>
            {ai.level && (
              <span
                className={styles.aiLevel}
                style={{ "--level-color": LEVEL_COLOR[ai.level] ?? "#6b7280" } as React.CSSProperties}
              >
                {ai.level}
              </span>
            )}
            {ai.remote && ai.remote !== "On-site" && (
              <span className={styles.aiRemote}>{ai.remote}</span>
            )}
            {ai.highlights.map((h) => (
              <span key={h} className={styles.aiHighlight}>{h}</span>
            ))}
          </div>
          {ai.stack.length > 0 && (
            <div className={styles.aiStack}>
              {ai.stack.slice(0, 6).map((s) => (
                <span key={s} className={styles.aiChip}>{s}</span>
              ))}
            </div>
          )}
        </div>
      ) : (
        job.excerpt && (
          <p className={styles.excerpt} dir="auto">{job.excerpt}</p>
        )
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

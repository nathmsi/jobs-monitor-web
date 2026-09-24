import { useState } from "react";
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
  Intern: "#6b7280",
  Junior: "#3b82f6",
  Mid: "#8b5cf6",
  Senior: "#f59e0b",
  Staff: "#ef4444",
  Lead: "#ef4444",
  Manager: "#10b981",
  Director: "#10b981",
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
  const [expanded, setExpanded] = useState(false);

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

  const rawDesc = job.description || job.excerpt || "";

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

      {/* ── Header: logo + company + status badges ── */}
      <header className={styles.head}>
        <span className={styles.origin}>
          {source && <Avatar source={source} size={28} />}
          {sourceLabel && <span className={styles.source}>{sourceLabel}</span>}
        </span>
        <div className={styles.badges}>
          {job.is_new && !opened && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && <Badge variant="hot">🔥 {t("job.hot")}</Badge>}
          {applied && <Badge variant="applied">✓ {t("job.applied")}</Badge>}
          {!applied && opened && <span className={styles.seenTag}>{t("job.seen")}</span>}
        </div>
      </header>

      {/* ── Title ── */}
      <h3 className={styles.title} dir="auto">
        {job.url ? (
          <a href={job.url} target="_blank" rel="noreferrer" onClick={() => markOpened(id)}>
            {job.title}
          </a>
        ) : (
          job.title
        )}
      </h3>

      {/* ── One-line meta: location · level · remote ── */}
      <div className={styles.meta}>
        {job.location && (
          <span className={styles.metaLocation}>
            <svg width="11" height="13" viewBox="0 0 12 14" fill="none" aria-hidden>
              <path d="M6 0C3.24 0 1 2.24 1 5c0 3.75 5 9 5 9s5-5.25 5-9c0-2.76-2.24-5-5-5zm0 6.5A1.5 1.5 0 1 1 6 3.5a1.5 1.5 0 0 1 0 3z" fill="currentColor"/>
            </svg>
            {job.location}
          </span>
        )}
        {ai?.level && (
          <span
            className={styles.metaLevel}
            style={{ "--level-color": LEVEL_COLOR[ai.level] ?? "#6b7280" } as React.CSSProperties}
          >
            {ai.level}
          </span>
        )}
        {ai?.remote && ai.remote !== "On-site" && (
          <span className={styles.metaRemote}>
            {ai.remote === "Remote" ? "🌐 " : "⚡ "}{ai.remote}
          </span>
        )}
      </div>

      {/* ── AI block ── */}
      {ai ? (
        <div className={styles.aiBlock}>
          <div className={styles.aiHeadlineRow}>
            <p className={styles.aiHeadline} dir="auto">{ai.headline}</p>
            {rawDesc && (
              <button
                className={styles.expandBtn}
                onClick={() => setExpanded((v) => !v)}
                title={expanded ? "Réduire" : "Voir la description complète"}
                aria-expanded={expanded}
              >
                <svg
                  width="14" height="14" viewBox="0 0 14 14" fill="none"
                  className={expanded ? styles.expandIconOpen : ""}
                  aria-hidden
                >
                  <path d="M2 4.5L7 9.5L12 4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>

          {expanded && rawDesc && (
            <p className={styles.fullDesc} dir="auto">{rawDesc}</p>
          )}

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
      ) : (
        rawDesc && (
          <p className={styles.excerpt} dir="auto">
            {rawDesc.slice(0, 160)}{rawDesc.length > 160 ? "…" : ""}
          </p>
        )
      )}

      {/* ── Match bar ── */}
      {match.count > 0 && (
        <div
          className={styles.matchBar}
          title={`Compétences : ${match.matched.join(", ")}`}
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden>
            <path d="M6 1L7.5 4.5H11L8.25 6.75L9.25 10.5L6 8.25L2.75 10.5L3.75 6.75L1 4.5H4.5L6 1Z" fill="currentColor"/>
          </svg>
          {t("match.skills", { count: match.count })}
          <span className={styles.matchSkills}>{match.matched.slice(0, 3).join(" · ")}</span>
        </div>
      )}

      {/* ── Footer actions ── */}
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

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
    const p = JSON.parse(raw) as AiInfo;
    if (p.headline && p.stack) return p;
  } catch {}
  return null;
}

const LEVEL_COLOR: Record<string, string> = {
  Intern: "#94a3b8", Junior: "#60a5fa", Mid: "#a78bfa",
  Senior: "#f59e0b", Staff: "#f97316", Lead: "#ef4444",
  Manager: "#10b981", Director: "#10b981",
};

interface Props {
  job: Job;
  source?: SourceInfo;
}

export function JobCard({ job, source }: Props) {
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
  const match = matchScore(`${job.title} ${job.excerpt} ${job.description ?? ""}`, profile);
  const rawDesc = job.description || job.excerpt || "";

  const cardClass = [
    styles.card,
    job.is_new ? styles.isNew : "",
    opened ? styles.opened : "",
    applied ? styles.applied : "",
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
          {job.is_new && !opened && <Badge variant="new">{t("job.new")}</Badge>}
          {job.is_hot && <Badge variant="hot">🔥 {t("job.hot")}</Badge>}
          {applied && <Badge variant="applied">✓ {t("job.applied")}</Badge>}
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
          <span className={styles.levelBadge} style={{ "--lc": LEVEL_COLOR[ai.level] ?? "#94a3b8" } as React.CSSProperties}>
            {ai.level}
          </span>
        )}
        {ai?.remote && ai.remote !== "On-site" && (
          <span className={styles.remoteBadge}>
            {ai.remote === "Remote" ? "Remote" : "Hybrid"}
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

          {rawDesc && (
            <>
              <button
                className={styles.expandToggle}
                onClick={() => setExpanded(v => !v)}
                aria-expanded={expanded}
              >
                {expanded ? t("job.hideDesc") : t("job.showDesc")}
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={expanded ? styles.chevronUp : ""} aria-hidden>
                  <path d="M1.5 3L5 6.5L8.5 3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              {expanded && <p className={styles.fullDesc}>{rawDesc}</p>}
            </>
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
          onClick={() => setStatus(job, saved ? null : "saved", source?.label)}
          aria-pressed={saved}
        >
          {saved ? "★" : "☆"} {saved ? t("job.saved") : t("job.save")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${applied ? styles.btnAppliedOn : ""}`}
          onClick={() => setStatus(job, applied ? "saved" : "applied", source?.label)}
          aria-pressed={applied}
        >
          {applied ? `✓ ${t("job.applied")}` : t("job.markApplied")}
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
}

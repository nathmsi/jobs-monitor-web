import { useTranslation } from "react-i18next";

import { useToast } from "../../lib/toast";

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
  const { showToast } = useToast();
  const { isOpened, markOpened } = useJobFlags();
  const { statusOf, setStatus } = useSavedJobs();
  const { profile } = useProfile();

  const id = jobId(job.source, job.external_id);
  const opened = isOpened(id);
  const status = statusOf(job.source, job.external_id);
  const saved = status !== undefined;
  const applied = status === "applied";

  const ai = parseAiSummary(job.ai_summary);
  const match = matchScore(`${job.title} ${job.excerpt} ${job.description ?? ""}`, profile);
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
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
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
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
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
          onClick={() => {
            const next = saved ? null : "saved";
            setStatus(job, next, source?.label);
            if (next === "saved") showToast(t("job.savedToast"));
          }}
          aria-pressed={saved}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>
          {saved ? t("job.saved") : t("job.save")}
        </button>
        <button
          type="button"
          className={`${styles.btn} ${applied ? styles.btnAppliedOn : ""}`}
          onClick={() => {
            const next = applied ? "saved" : "applied";
            setStatus(job, next, source?.label);
            if (next === "applied") showToast(t("job.appliedToast"));
          }}
          aria-pressed={applied}
        >
          {applied && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>}
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
}

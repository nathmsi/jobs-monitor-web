import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { rankScore } from "../../lib/cvAnalysis";
import { useProfile } from "../../lib/profile";
import { JobCard } from "../JobCard/JobCard";
import type { Job, SourceInfo } from "../../types";
import styles from "./ForMe.module.css";

const PAGE_SIZE = 24;

interface Props {
  jobs: Job[];
  sources: SourceInfo[];
  loading?: boolean;
  onEditProfile: () => void;
}

export function ForMe({ jobs, sources, loading = false, onEditProfile }: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { profile } = useProfile();
  const [page, setPage] = useState(1);

  const sourceByKey = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s])),
    [sources],
  );

  const ranked = useMemo(() => {
    if (!profile) return [];
    return jobs
      .map((job) => ({
        job,
        score: rankScore(
          `${job.title} ${job.excerpt} ${job.description ?? ""}`,
          profile,
        ),
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);
  }, [jobs, profile]);

  const visible = ranked.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < ranked.length;

  if (loading) {
    return (
      <div className={styles.skeleton}>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} />
        ))}
      </div>
    );
  }

  if (!profile || profile.skills.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        <p>{t("forme.noProfile")}</p>
        <button className={styles.ctaPrimary} onClick={() => navigate("/coach")}>
          {t("forme.ctaBtn")}
        </button>
        <button className={styles.ctaSecondary} onClick={onEditProfile}>
          {t("profile.title")}
        </button>
      </div>
    );
  }

  if (ranked.length === 0) {
    return <p className={styles.empty}>{t("forme.noMatch")}</p>;
  }

  return (
    <>
      <p className={styles.count}>
        {t("forme.summary", { count: ranked.length })}
      </p>
      <div className={styles.grid}>
        {visible.map(({ job }) => (
          <JobCard
            key={`${job.source}-${job.external_id}`}
            job={job}
            source={sourceByKey[job.source]}
          />
        ))}
      </div>
      {hasMore && (
        <div className={styles.loadMoreRow}>
          <button className={styles.loadMore} onClick={() => setPage((p) => p + 1)}>
            {t("loadMore.button")}
          </button>
        </div>
      )}
    </>
  );
}

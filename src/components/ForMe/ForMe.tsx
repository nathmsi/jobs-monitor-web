import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { rankScore } from "../../lib/cvAnalysis";
import { useProfile } from "../../lib/profile";
import { JobCard } from "../JobCard/JobCard";
import type { Job, SourceInfo } from "../../types";
import styles from "./ForMe.module.css";

const PAGE_SIZE = 24;

interface Props {
  jobs: Job[];
  sources: SourceInfo[];
  onEditProfile: () => void;
}

export function ForMe({ jobs, sources, onEditProfile }: Props) {
  const { t } = useTranslation();
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

  if (!profile || profile.skills.length === 0) {
    return (
      <div className={styles.empty}>
        <p>{t("forme.noProfile")}</p>
        <button className={styles.cta} onClick={onEditProfile}>
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

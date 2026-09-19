import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { matchScore } from "../../lib/cvAnalysis";
import { useProfile } from "../../lib/profile";
import { JobCard } from "../JobCard/JobCard";
import type { Job, SourceInfo } from "../../types";
import styles from "./ForMe.module.css";

interface Props {
  jobs: Job[];
  sources: SourceInfo[];
  onEditProfile: () => void;
}

export function ForMe({ jobs, sources, onEditProfile }: Props) {
  const { t } = useTranslation();
  const { profile } = useProfile();

  const labelBySource = useMemo(
    () => Object.fromEntries(sources.map((s) => [s.key, s.label])),
    [sources],
  );

  const ranked = useMemo(() => {
    if (!profile) return [];
    return jobs
      .map((job) => ({
        job,
        score: matchScore(
          `${job.title} ${job.excerpt} ${job.description ?? ""}`,
          profile,
        ).count,
      }))
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 120);
  }, [jobs, profile]);

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
        {ranked.map(({ job }) => (
          <JobCard
            key={`${job.source}-${job.external_id}`}
            job={job}
            sourceLabel={labelBySource[job.source]}
          />
        ))}
      </div>
    </>
  );
}

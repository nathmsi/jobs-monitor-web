import type { UseQueryResult } from "@tanstack/react-query";
import { useState } from "react";
import { useTranslation } from "react-i18next";

import { markForceRefresh } from "../../api/hooks";
import { avatarColor, initials } from "../../lib/avatar";
import { jobId, useJobFlags } from "../../lib/jobFlags";
import type { RefreshResult, SourceInfo } from "../../types";
import { JobCard } from "../JobCard/JobCard";
import { JobCardSkeleton } from "../JobCardSkeleton/JobCardSkeleton";
import styles from "./SourceSection.module.css";

interface Props {
  source: SourceInfo;
  query: UseQueryResult<RefreshResult, Error>;
}

const SKELETON_COUNT = 6;

export function SourceSection({ source, query }: Props) {
  const { t, i18n } = useTranslation();
  const { data, isFetching, isError, error, refetch, dataUpdatedAt } = query;
  const { hideSeen, isOpened } = useJobFlags();
  const [open, setOpen] = useState(false);

  const showSkeleton = isFetching && !data;
  const bodyId = `source-body-${source.key}`;

  const jobs = (data?.jobs ?? []).filter(
    (j) => !hideSeen || !isOpened(jobId(j.source, j.external_id)),
  );
  const visibleCount = jobs.length;
  const newCount = jobs.filter((j) => j.is_new).length;

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className={styles.section}>
      <div className={`${styles.card} ${open ? styles.cardOpen : ""}`}>
        <button
          className={styles.toggle}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={bodyId}
        >
          <span
            className={styles.avatar}
            style={{ backgroundColor: avatarColor(source.key) }}
            aria-hidden
          >
            {initials(source.label)}
          </span>
          <span className={styles.titleGroup}>
            <span className={styles.title}>{source.label}</span>
            {data && (
              <span className={styles.meta}>
                {t("source.offers", { count: visibleCount })}
                {newCount > 0 && (
                  <>
                    {" · "}
                    <strong className={styles.metaNew}>
                      {t("source.new", { count: newCount })}
                    </strong>
                  </>
                )}
                {dataUpdatedAt > 0 &&
                  ` · ${t("source.updated", { time: formatTime(dataUpdatedAt) })}`}
              </span>
            )}
          </span>
        </button>

        <div className={styles.actions}>
          {data && visibleCount > 0 && (
            <span className={styles.countPill}>{visibleCount}</span>
          )}
          {source.site_url && (
            <a
              className={styles.ghostBtn}
              href={source.site_url}
              target="_blank"
              rel="noreferrer"
            >
              {t("source.openSite")}
            </a>
          )}
          <button
            className={styles.iconBtn}
            title={t("source.refresh")}
            aria-label={t("source.refresh")}
            onClick={() => {
              markForceRefresh(source.key);
              setOpen(true);
              refetch();
            }}
            disabled={isFetching}
          >
            ⟳
          </button>
          <span
            className={`${styles.chevron} ${open ? styles.chevronOpen : ""}`}
            aria-hidden
          >
            ▸
          </span>
        </div>
      </div>

      {open && (
        <div id={bodyId} className={styles.body}>
          {isError && (
            <div className={styles.alert} role="alert">
              {t("error.generic", { message: (error as Error).message })}
            </div>
          )}

          {showSkeleton ? (
            <div className={styles.grid}>
              {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
                <JobCardSkeleton key={i} />
              ))}
            </div>
          ) : (
            <div className={styles.grid}>
              {jobs.map((job) => (
                <JobCard key={`${job.source}-${job.external_id}`} job={job} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

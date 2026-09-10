import { useTranslation } from "react-i18next";

import { useSourceJobs } from "../../api/hooks";
import type { SourceInfo } from "../../types";
import { JobCard } from "../JobCard/JobCard";
import { JobCardSkeleton } from "../JobCardSkeleton/JobCardSkeleton";
import styles from "./SourceSection.module.css";

interface Props {
  source: SourceInfo;
}

const SKELETON_COUNT = 6;

export function SourceSection({ source }: Props) {
  const { t, i18n } = useTranslation();
  const query = useSourceJobs(source.key, source.auto_fetch);
  const { data, isFetching, isError, error, refetch, dataUpdatedAt } = query;

  const showSkeleton = isFetching && !data;

  const formatTime = (ts: number) =>
    new Date(ts).toLocaleTimeString(i18n.language, {
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <section className={styles.section}>
      <div className={styles.bar}>
        <div className={styles.titleGroup}>
          <h2 className={styles.title}>{source.label}</h2>
          {data && (
            <span className={styles.meta}>
              {t("source.offers", { count: data.count })}
              {data.new_count > 0 && (
                <>
                  {" · "}
                  <strong className={styles.metaNew}>
                    {t("source.new", { count: data.new_count })}
                  </strong>
                </>
              )}
              {dataUpdatedAt > 0 &&
                ` · ${t("source.updated", { time: formatTime(dataUpdatedAt) })}`}
            </span>
          )}
        </div>

        <div className={styles.actions}>
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
            className={styles.btn}
            onClick={() => refetch()}
            disabled={isFetching}
          >
            {isFetching ? t("source.loading") : t("source.refresh")}
          </button>
        </div>
      </div>

      {isError && (
        <div className={styles.alert} role="alert">
          {t("error.generic", { message: (error as Error).message })}
        </div>
      )}

      {showSkeleton && (
        <div className={styles.grid}>
          {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
            <JobCardSkeleton key={i} />
          ))}
        </div>
      )}

      {!showSkeleton && data && data.jobs.length > 0 && (
        <div className={styles.grid}>
          {data.jobs.map((job) => (
            <JobCard key={`${job.source}-${job.external_id}`} job={job} />
          ))}
        </div>
      )}

      {!showSkeleton && data && data.jobs.length === 0 && (
        <p className={styles.empty}>
          {t("source.empty")}
          {source.site_url && (
            <>
              {" "}
              <a href={source.site_url} target="_blank" rel="noreferrer">
                {t("source.emptyLink")}
              </a>
            </>
          )}
        </p>
      )}

      {!showSkeleton && !data && !isError && (
        <p className={styles.idle}>
          {source.auto_fetch ? t("source.ready") : t("source.onDemand")}
          {source.site_url && (
            <>
              {" "}
              <a href={source.site_url} target="_blank" rel="noreferrer">
                {t("source.openSite")}
              </a>
            </>
          )}
        </p>
      )}
    </section>
  );
}

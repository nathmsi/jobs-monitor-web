import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { useRegions, useSources, useTopic } from "../api/hooks";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { usePageMeta } from "../hooks/usePageMeta";
import { errorMessage } from "../utils/errorMessage";
import { regionLabel } from "../utils/regionLabel";
import { topicPath } from "../utils/slug";
import styles from "./TopicPage.module.css";

/** "React jobs in Tel Aviv": the live offers for one technology (or role) in one region. */
export function TopicPage() {
  const { t, i18n } = useTranslation();
  const { tech = "", region = "all" } = useParams();
  const query = useTopic(tech, region);
  const { data: sources } = useSources();
  const { data: regions } = useRegions();
  const data = query.data;
  const notFound = query.isError && /HTTP 404/.test(String(query.error));

  const regionName = data ? regionLabel(data.region, i18n.language) : "";
  const title = data
    ? data.region.key === "all"
      ? t("topic.titleAll", { tech: data.tech.label })
      : t("topic.title", { tech: data.tech.label, region: regionName })
    : t("topic.notFound");

  usePageMeta({
    title,
    description: data ? `${t("topic.count", { count: data.total })} · ${title}` : undefined,
    path: data ? topicPath(data.tech.slug, data.region.key) : undefined,
    noindex: !data || data.total < 3,
  });

  const sourceByKey = new Map((sources ?? []).map((s) => [s.key, s]));

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        {query.isPending && <div className={styles.skeleton} aria-busy="true" />}

        {notFound && <EmptyState text={t("topic.notFound")} actionLabel={t("topic.noneCta")} to="/jobs" />}

        {query.isError && !notFound && (
          <div className={styles.error} role="alert">
            <p>{errorMessage(query.error)}</p>
            <button type="button" className={styles.retry} onClick={() => query.refetch()}>{t("error.tryAgain")}</button>
          </div>
        )}

        {data && (
          <>
            <h1 className={styles.title}>{title}</h1>
            <p className={styles.count}>{t("topic.count", { count: data.total })}</p>

            {regions && (
              <nav aria-label={t("topic.otherRegions")} className={styles.regions}>
                {regions.filter((r) => r.key !== data.region.key).map((r) => (
                  <Link key={r.key} to={topicPath(data.tech.slug, r.key)} className={styles.region}>
                    {regionLabel(r, i18n.language)}
                  </Link>
                ))}
              </nav>
            )}

            {data.jobs.length === 0 ? (
              <EmptyState text={t("topic.none")} actionLabel={t("topic.noneCta")} to="/jobs" />
            ) : (
              <ul className={styles.list}>
                {data.jobs.map((job) => (
                  <li key={`${job.source}-${job.external_id}`}>
                    <JobCard job={job} source={sourceByKey.get(job.source)} />
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </main>
    </div>
  );
}

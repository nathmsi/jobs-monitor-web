import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";

import { useCompany } from "../api/hooks";
import { Avatar } from "../components/Avatar/Avatar";
import { EmptyState } from "../components/EmptyState/EmptyState";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { usePageMeta } from "../hooks/usePageMeta";
import { errorMessage } from "../utils/errorMessage";
import { companyPath } from "../utils/slug";
import styles from "./CompanyPage.module.css";

/** A company or agency: who they are and every offer they have open. */
export function CompanyPage() {
  const { t } = useTranslation();
  const { key = "" } = useParams();
  const query = useCompany(key);
  const data = query.data;
  const notFound = query.isError && /HTTP 404/.test(String(query.error));
  const name = data?.source.label ?? "";

  const description = useMemo(
    () => (data ? `${t("company.openOffers", { count: data.total })} · ${data.top_skills.slice(0, 4).map((s) => s.skill).join(", ")}` : undefined),
    [data, t],
  );

  usePageMeta({
    title: data ? t("company.title", { company: name }) : t("company.notFound"),
    description,
    path: data ? companyPath(key) : undefined,
    noindex: !data || data.total === 0,
  });

  return (
    <div className={styles.app}>
      <Header />
      <main className={styles.main}>
        {query.isPending && <div className={styles.skeleton} aria-busy="true" />}

        {notFound && (
          <EmptyState text={t("company.notFound")} actionLabel={t("company.noneCta")} to="/jobs" />
        )}

        {query.isError && !notFound && (
          <div className={styles.error} role="alert">
            <p>{errorMessage(query.error)}</p>
            <button type="button" className={styles.retry} onClick={() => query.refetch()}>{t("error.tryAgain")}</button>
          </div>
        )}

        {data && (
          <>
            <header className={styles.head}>
              <Avatar source={data.source} size={56} />
              <div>
                <h1 className={styles.title}>{name}</h1>
                <p className={styles.sub}>
                  {data.source.kind === "agency" ? t("company.kindAgency") : t("company.kindCompany")}
                  {" · "}
                  {t("company.openOffers", { count: data.total })}
                </p>
                {data.source.site_url && (
                  <a href={data.source.site_url} target="_blank" rel="noreferrer" className={styles.site}>
                    {t("company.site")}
                  </a>
                )}
              </div>
            </header>

            {data.top_skills.length > 0 && (
              <section aria-labelledby="company-skills">
                <h2 id="company-skills" className={styles.h2}>{t("company.skills")}</h2>
                <ul className={styles.skills}>
                  {data.top_skills.map((s) => <li key={s.skill} className={styles.skill}>{s.skill}</li>)}
                </ul>
              </section>
            )}

            {data.jobs.length === 0 ? (
              <EmptyState text={t("company.none")} actionLabel={t("company.noneCta")} to="/jobs" />
            ) : (
              <ul className={styles.list}>
                {data.jobs.map((job) => (
                  <li key={`${job.source}-${job.external_id}`}>
                    <JobCard job={job} source={data.source} />
                  </li>
                ))}
              </ul>
            )}

            <Link to="/jobs" className={styles.all}>{t("company.noneCta")}</Link>
          </>
        )}
      </main>
    </div>
  );
}

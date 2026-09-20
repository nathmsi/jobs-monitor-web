import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { useRegionJobs, useSources } from "../api/hooks";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { ProfileEditor } from "../components/ProfileEditor/ProfileEditor";
import { matchScore, rankScore } from "../lib/cvAnalysis";
import { useProfile } from "../lib/profile";
import styles from "./ProfilePage.module.css";

export function ProfilePage() {
  const { t } = useTranslation();
  const { profile } = useProfile();
  const { data: sources } = useSources();
  const { data: jobs } = useRegionJobs("all");

  const hasProfile = !!profile && profile.skills.length > 0;

  const labelBySource = useMemo(
    () => Object.fromEntries((sources ?? []).map((s) => [s.key, s.label])),
    [sources],
  );

  // Score every offer against the profile once: keep the best matches for the
  // recommendations and tally which of my skills are the most in demand.
  const { ranked, matchingCount, topSkills } = useMemo(() => {
    if (!hasProfile || !jobs) {
      return { ranked: [], matchingCount: 0, topSkills: [] as [string, number][] };
    }
    const scored = jobs
      .map((job) => {
        const text = `${job.title} ${job.excerpt} ${job.description ?? ""}`;
        return { job, score: rankScore(text, profile), matched: matchScore(text, profile).matched };
      })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    const demand: Record<string, number> = {};
    for (const r of scored) {
      for (const s of r.matched) demand[s] = (demand[s] ?? 0) + 1;
    }
    const topSkills = Object.entries(demand)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8) as [string, number][];

    return { ranked: scored.slice(0, 8), matchingCount: scored.length, topSkills };
  }, [jobs, profile, hasProfile]);

  const maxDemand = topSkills[0]?.[1] ?? 1;

  return (
    <div className={styles.app}>
      <Header />

      <Link to="/" className={styles.back}>
        ← {t("profile.back")}
      </Link>

      <div className={styles.intro}>
        <h1 className={styles.title}>{t("profile.pageTitle")}</h1>
        <p className={styles.lead}>{t("profile.pageLead")}</p>
      </div>

      <div className={styles.grid}>
        <section className={styles.col}>
          <h2 className={styles.cardTitle}>{t("profile.editorTitle")}</h2>
          <div className={styles.card}>
            <ProfileEditor />
          </div>
        </section>

        <aside className={styles.aside}>
          {!hasProfile ? (
            <div className={styles.card}>
              <p className={styles.empty}>{t("profile.emptyStats")}</p>
            </div>
          ) : (
            <>
              <div className={styles.card}>
                <div className={styles.statHead}>
                  <span className={styles.statNumber}>{matchingCount}</span>
                  <span className={styles.statLabel}>
                    {t("profile.matchingOffers", { count: matchingCount })}
                  </span>
                </div>
                {topSkills.length > 0 && (
                  <>
                    <div className={styles.blockLabel}>{t("profile.topSkills")}</div>
                    <ul className={styles.demandList}>
                      {topSkills.map(([skill, n]) => (
                        <li key={skill} className={styles.demandRow}>
                          <span className={styles.demandName}>{skill}</span>
                          <span className={styles.demandBar}>
                            <span
                              className={styles.demandFill}
                              style={{ width: `${Math.round((n / maxDemand) * 100)}%` }}
                            />
                          </span>
                          <span className={styles.demandCount}>{n}</span>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <div className={styles.card}>
                <div className={styles.recHead}>
                  <h2 className={styles.cardTitle}>{t("profile.recommended")}</h2>
                  <Link to="/" className={styles.seeAll}>
                    {t("profile.seeAll")}
                  </Link>
                </div>
                {ranked.length === 0 ? (
                  <p className={styles.empty}>{t("forme.noMatch")}</p>
                ) : (
                  <div className={styles.recList}>
                    {ranked.map(({ job }) => (
                      <JobCard
                        key={`${job.source}-${job.external_id}`}
                        job={job}
                        sourceLabel={labelBySource[job.source]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </aside>
      </div>

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

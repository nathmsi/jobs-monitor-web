import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useCounts, useJobsInfinite, useRegionJobs, useSources } from "../api/hooks";
import { ForMe } from "../components/ForMe/ForMe";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { MyJobs } from "../components/MyJobs/MyJobs";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { SourcesModal } from "../components/SourcesModal/SourcesModal";
import { rankScore } from "../lib/cvAnalysis";
import { jobId, useJobFlags } from "../lib/jobFlags";
import { usePreferences } from "../lib/preferences";
import { useProfile } from "../lib/profile";
import { useSavedJobs } from "../lib/savedJobs";
import type { Filters } from "../types";
import styles from "../App.module.css";

type Tab = "company" | "agency" | "mine" | "forme";

export function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { prefs } = usePreferences();

  const [filters, setFilters] = useState<Filters>({
    region: prefs.region ?? "all",
    q: "",
    role: prefs.roles[0],
    category: prefs.categories[0],
  });
  const [showAll, setShowAll] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [tab, setTab] = useState<Tab>(
    prefs.kind === "agency" ? "agency" : "company"
  );
  const [sort, setSort] = useState("recent");

  const { data: sources } = useSources();
  const { items: savedItems } = useSavedJobs();
  const { profile } = useProfile();
  const { hideSeen, isOpened } = useJobFlags();

  const browsing = tab === "company" || tab === "agency";
  const kind = browsing ? tab : "";

  // Server-side filtered + paginated offers for the browse tabs.
  const jobsQuery = useJobsInfinite(
    { region: filters.region, q: filters.q, role: filters.role, category: filters.category, kind, sort },
    browsing,
  );

  // Full region set (limit=0) only when the "For me" tab needs to rank locally.
  const { data: allJobs } = useRegionJobs(filters.region, tab === "forme");

  // Totals for tab + category badges (independent of the page being viewed).
  const { data: counts } = useCounts({
    region: filters.region,
    q: filters.q,
    role: filters.role,
  });

  const sourceList = sources ?? [];
  const sourceByKey = useMemo(
    () => Object.fromEntries(sourceList.map((s) => [s.key, s])),
    [sourceList],
  );

  // Flatten the loaded pages, applying the client-side "hide seen" toggle.
  const jobs = useMemo(() => {
    const all = jobsQuery.data?.pages.flatMap((p) => p.jobs) ?? [];
    if (!hideSeen) return all;
    return all.filter((j) => !isOpened(jobId(j.source, j.external_id)));
  }, [jobsQuery.data, hideSeen, isOpened]);

  const companyCount = counts?.kinds.company ?? 0;
  const agencyCount = counts?.kinds.agency ?? 0;
  const catCounts = counts?.categories ?? {};

  // Categories for the sidebar (company tab): drop the agency-only "staffing"
  // bucket, order by number of offers.
  const categories = useMemo(
    () =>
      Object.keys(catCounts)
        .filter((c) => c !== "staffing")
        .sort((a, b) => (catCounts[b] ?? 0) - (catCounts[a] ?? 0)),
    [catCounts],
  );

  const activeCategory =
    filters.category && categories.includes(filters.category)
      ? filters.category
      : undefined;

  // "For me" badge = matching offers, computed once the full set is loaded.
  const formeCount = useMemo(() => {
    if (!profile || profile.skills.length === 0 || !allJobs) return null;
    return allJobs.filter(
      (j) => rankScore(`${j.title} ${j.excerpt} ${j.description ?? ""}`, profile) > 0,
    ).length;
  }, [allJobs, profile]);

  const tabTotal = tab === "company" ? companyCount : agencyCount;

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.tabbar} role="tablist">
        <button
          role="tab"
          aria-selected={tab === "company"}
          className={`${styles.tab} ${tab === "company" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("company");
            setFilters((f) => ({ ...f, category: undefined }));
          }}
        >
          {t("tabs.companies")} <span className={styles.tabCount}>{companyCount}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "agency"}
          className={`${styles.tab} ${tab === "agency" ? styles.tabActive : ""}`}
          onClick={() => {
            setTab("agency");
            setFilters((f) => ({ ...f, category: undefined }));
          }}
        >
          {t("tabs.agencies")} <span className={styles.tabCount}>{agencyCount}</span>
        </button>

        <span className={styles.tabDivider} aria-hidden />

        <button
          role="tab"
          aria-selected={tab === "mine"}
          className={`${styles.tab} ${tab === "mine" ? styles.tabActive : ""}`}
          onClick={() => setTab("mine")}
        >
          {t("tabs.mine")} <span className={styles.tabCount}>{savedItems.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "forme"}
          className={`${styles.tab} ${tab === "forme" ? styles.tabActive : ""}`}
          onClick={() => setTab("forme")}
        >
          {t("tabs.forme")}
          {formeCount != null && <span className={styles.tabCount}>{formeCount}</span>}
        </button>
      </div>

      <div className={styles.layout}>
        <div className={`${styles.side} ${filtersOpen ? styles.sideOpen : ""}`}>
          <Sidebar
            filters={filters}
            onChange={setFilters}
            showCategories={tab === "company"}
            categories={categories}
            catCounts={catCounts}
            activeCategory={activeCategory}
            totalInTab={companyCount}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.contentBar}>
            <button
              className={styles.filtersToggle}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              ⚙ {t("filters.toggle")}
            </button>
            {browsing && (
              <span className={styles.stats}>
                {t("stats.offers", { count: tabTotal })}
              </span>
            )}
            {browsing && (
              <label className={styles.sortWrap}>
                <span className={styles.sortLabel}>{t("sort.label")}</span>
                <select
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(e) => setSort(e.target.value)}
                  aria-label={t("sort.label")}
                >
                  <option value="recent">{t("sort.recent")}</option>
                  <option value="oldest">{t("sort.oldest")}</option>
                  <option value="hot">{t("sort.hot")}</option>
                </select>
              </label>
            )}
            <button className={styles.allBtn} onClick={() => setShowAll(true)}>
              {t("allCompanies.open", { count: sourceList.length })}
            </button>
          </div>

          {tab === "mine" ? (
            <MyJobs />
          ) : tab === "forme" ? (
            <ForMe
              jobs={allJobs ?? []}
              sources={sourceList}
              onEditProfile={() => navigate("/profile")}
            />
          ) : (
            <main className={styles.grid}>
              {jobsQuery.isError && (
                <div className={styles.alert} role="alert">
                  <strong>{t("error.apiTitle")}</strong>
                  <br />
                  {(jobsQuery.error as Error).message}
                </div>
              )}

              {jobsQuery.isLoading &&
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className={styles.bootBar} />
                ))}

              {!jobsQuery.isLoading &&
                jobs.map((job) => (
                  <JobCard
                    key={`${job.source}-${job.external_id}`}
                    job={job}
                    source={sourceByKey[job.source]}
                  />
                ))}

              {!jobsQuery.isLoading && jobs.length === 0 && (
                <p className={styles.noResults}>{t("noResults")}</p>
              )}

              {jobsQuery.hasNextPage && (
                <div className={styles.loadMoreRow}>
                  <button
                    className={styles.loadMore}
                    onClick={() => jobsQuery.fetchNextPage()}
                    disabled={jobsQuery.isFetchingNextPage}
                  >
                    {jobsQuery.isFetchingNextPage
                      ? t("loadMore.loading")
                      : t("loadMore.button")}
                  </button>
                </div>
              )}
            </main>
          )}
        </div>
      </div>

      <footer className={styles.footer}>{t("footer")}</footer>

      {showAll && (
        <SourcesModal
          sources={sourceList}
          counts={counts?.by_source ?? {}}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

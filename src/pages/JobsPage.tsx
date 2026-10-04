import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useJobsInfinite, useRegionJobs, useSources } from "../api/hooks";
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
  const [viewMode, setViewMode] = useState<"grid" | "list">(() => {
    try { return (localStorage.getItem("jobsViewMode") as "grid" | "list") ?? "list"; } catch { return "list"; }
  });

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
  const { data: allJobs, isLoading: allJobsLoading } = useRegionJobs(filters.region, tab === "forme");

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

  // "For me" badge = matching offers, computed once the full set is loaded.
  const formeCount = useMemo(() => {
    if (!profile || !Array.isArray(profile.skills) || profile.skills.length === 0 || !allJobs) return null;
    return allJobs.filter(
      (j) => rankScore(`${j.title} ${j.excerpt} ${j.description ?? ""}`, profile) > 0,
    ).length;
  }, [allJobs, profile]);

  useEffect(() => {
    document.title = t("nav.offers") + " — Tech Jobs";
  }, [t]);

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
          {t("tabs.companies")}
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
          {t("tabs.agencies")}
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

      {filtersOpen && (
        <div className={styles.filterBackdrop} onClick={() => setFiltersOpen(false)} />
      )}

      <div className={styles.layout}>
        <div className={`${styles.side} ${filtersOpen ? styles.sideOpen : ""}`}>
          <button
            className={styles.filterSheetClose}
            onClick={() => setFiltersOpen(false)}
            aria-label={t("filters.close")}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            {t("filters.close")}
          </button>
          <Sidebar
            filters={filters}
            onChange={setFilters}
          />
        </div>

        <div className={styles.content}>
          <div className={styles.contentBar}>
            <button
              className={styles.filtersToggle}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="4" y1="6" x2="20" y2="6"/><line x1="8" y1="12" x2="16" y2="12"/><line x1="11" y1="18" x2="13" y2="18"/></svg>
              {t("filters.toggle")}
            </button>
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
            {browsing && (
              <button className={styles.allBtn} onClick={() => setShowAll(true)}>
                {t("allCompanies.open", { count: sourceList.length })}
              </button>
            )}

            {/* View mode toggle */}
            <div className={styles.viewToggle} role="group" aria-label={t("viewMode.list")}>
              <button
                className={`${styles.viewBtn} ${viewMode === "list" ? styles.viewBtnActive : ""}`}
                onClick={() => { setViewMode("list"); try { localStorage.setItem("jobsViewMode", "list"); } catch {} }}
                aria-pressed={viewMode === "list"}
                aria-label={t("viewMode.list")}
                title={t("viewMode.list")}
              >
                {/* list icon */}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="1" y="2" width="14" height="2.5" rx="1" fill="currentColor"/>
                  <rect x="1" y="6.75" width="14" height="2.5" rx="1" fill="currentColor"/>
                  <rect x="1" y="11.5" width="14" height="2.5" rx="1" fill="currentColor"/>
                </svg>
              </button>
              <button
                className={`${styles.viewBtn} ${viewMode === "grid" ? styles.viewBtnActive : ""}`}
                onClick={() => { setViewMode("grid"); try { localStorage.setItem("jobsViewMode", "grid"); } catch {} }}
                aria-pressed={viewMode === "grid"}
                aria-label={t("viewMode.grid")}
                title={t("viewMode.grid")}
              >
                {/* grid icon */}
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                  <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/>
                  <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
                  <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor"/>
                </svg>
              </button>
            </div>
          </div>

          <div key={tab} className={styles.tabContent}>
          {tab === "mine" ? (
            <MyJobs />
          ) : tab === "forme" ? (
            <ForMe
              jobs={allJobs ?? []}
              sources={sourceList}
              loading={allJobsLoading}
              onEditProfile={() => navigate("/profile")}
            />
          ) : (
            <main className={viewMode === "grid" ? styles.grid : styles.gridList}>
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
                <div className={styles.noResultsEmpty}>
                  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  <p className={styles.noResultsText}>{t("noResults")}</p>
                  <button
                    className={styles.noResultsClear}
                    onClick={() => setFilters((f) => ({ ...f, q: "", role: undefined, category: undefined }))}
                  >
                    {t("filters.clear")}
                  </button>
                </div>
              )}

              {jobsQuery.hasNextPage && (
                <div className={styles.loadMoreRow}>
                  <div className={styles.loadMoreMeta}>
                    {t("loadMore.showing", {
                      shown: jobs.length,
                      total: jobsQuery.data?.pages[0]?.total ?? jobs.length,
                    })}
                  </div>
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
      </div>

      <footer className={styles.footer}>{t("footer")}</footer>

      {showAll && (
        <SourcesModal
          sources={sourceList}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

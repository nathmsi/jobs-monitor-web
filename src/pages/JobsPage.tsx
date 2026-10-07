import { useMemo, useState, type KeyboardEvent } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";

import { useJobsInfinite, useRegionJobs, useSources } from "../api/hooks";
import { ForMe } from "../components/ForMe/ForMe";
import { Header } from "../components/Header/Header";
import { JobCard } from "../components/JobCard/JobCard";
import { MyJobs } from "../components/MyJobs/MyJobs";
import { Sidebar } from "../components/Sidebar/Sidebar";
import { SourcesModal } from "../components/SourcesModal/SourcesModal";
import { rankScore } from "../utils/cvAnalysis";
import { jobId } from "../utils/jobId";
import { useJobFlags } from "../providers/jobFlags/useJobFlags";
import { errorMessage } from "../utils/errorMessage";
import { jobText } from "../utils/jobText";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { useJobsUrlState, type JobsSort } from "../hooks/useJobsUrlState";
import { useProfile } from "../providers/profile/useProfile";
import { useSavedJobs } from "../providers/savedJobs/useSavedJobs";
import { CloseIcon, FilterIcon, SearchIcon } from "../components/Icons/Icons";
import styles from "../App.module.css";

const JOBS_TABS = ["company", "agency", "mine", "forme"] as const;

type ViewMode = "grid" | "list";
const VIEW_MODE_KEY = "jobsViewMode";

function readViewMode(): ViewMode {
  try {
    return localStorage.getItem(VIEW_MODE_KEY) === "grid" ? "grid" : "list";
  } catch {
    return "list";
  }
}

export function JobsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { filters, tab, sort, setFilters, setTab, setSort } = useJobsUrlState();

  const [showAll, setShowAll] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewModeState] = useState<ViewMode>(readViewMode);
  const setViewMode = (mode: ViewMode) => {
    setViewModeState(mode);
    try { localStorage.setItem(VIEW_MODE_KEY, mode); } catch { /* ignore */ }
  };

  const { data: sources } = useSources();
  const { items: savedItems } = useSavedJobs();
  const { profile } = useProfile();
  const { hideSeen, isOpened } = useJobFlags();

  const browsing = tab === "company" || tab === "agency";
  const kind = browsing ? tab : ("" as const);

  // Server-side filtered + paginated offers for the browse tabs.
  const jobsQuery = useJobsInfinite(
    { region: filters.region, q: filters.q, role: filters.role, category: filters.category, kind, sort },
    browsing,
  );

  // Full region set (limit=0) only when the "For me" tab needs to rank locally.
  const allJobsQuery = useRegionJobs(filters.region, tab === "forme");
  const allJobs = allJobsQuery.data;

  const sourceList = useMemo(() => sources ?? [], [sources]);
  const sourceByKey = useMemo(
    () => Object.fromEntries(sourceList.map((s) => [s.key, s])),
    [sourceList],
  );

  // Flatten the loaded pages, applying the client-side "hide seen" toggle.
  const { jobs, hiddenCount } = useMemo(() => {
    const all = jobsQuery.data?.pages.flatMap((p) => p.jobs) ?? [];
    if (!hideSeen) return { jobs: all, hiddenCount: 0 };
    const visible = all.filter((j) => !isOpened(jobId(j.source, j.external_id)));
    return { jobs: visible, hiddenCount: all.length - visible.length };
  }, [jobsQuery.data, hideSeen, isOpened]);

  // "For me" badge = matching offers, computed once the full set is loaded.
  const formeCount = useMemo(() => {
    if (!profile || !Array.isArray(profile.skills) || profile.skills.length === 0 || !allJobs) return null;
    return allJobs.filter(
      (j) => rankScore(jobText(j), profile) > 0,
    ).length;
  }, [allJobs, profile]);

  useDocumentTitle("nav.offers");

  // Arrow-key navigation between tabs (WAI-ARIA tabs pattern).
  const onTabKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? 1 : e.key === "ArrowLeft" ? -1 : 0;
    if (!step) return;
    const flip = document.documentElement.dir === "rtl" ? -1 : 1;
    const next = JOBS_TABS[(JOBS_TABS.indexOf(tab) + step * flip + JOBS_TABS.length) % JOBS_TABS.length];
    setTab(next);
    document.getElementById(`tab-${next}`)?.focus();
  };

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.tabbar} role="tablist" onKeyDown={onTabKeyDown}>
        <button
          role="tab"
          id="tab-company"
          aria-controls="jobs-tabpanel"
          tabIndex={tab === "company" ? 0 : -1}
          aria-selected={tab === "company"}
          className={`${styles.tab} ${tab === "company" ? styles.tabActive : ""}`}
          onClick={() => setTab("company")}
        >
          {t("tabs.companies")}
        </button>
        <button
          role="tab"
          id="tab-agency"
          aria-controls="jobs-tabpanel"
          tabIndex={tab === "agency" ? 0 : -1}
          aria-selected={tab === "agency"}
          className={`${styles.tab} ${tab === "agency" ? styles.tabActive : ""}`}
          onClick={() => setTab("agency")}
        >
          {t("tabs.agencies")}
        </button>

        <span className={styles.tabDivider} aria-hidden />

        <button
          role="tab"
          id="tab-mine"
          aria-controls="jobs-tabpanel"
          tabIndex={tab === "mine" ? 0 : -1}
          aria-selected={tab === "mine"}
          className={`${styles.tab} ${tab === "mine" ? styles.tabActive : ""}`}
          onClick={() => setTab("mine")}
        >
          {t("tabs.mine")} <span className={styles.tabCount}>{savedItems.length}</span>
        </button>
        <button
          role="tab"
          id="tab-forme"
          aria-controls="jobs-tabpanel"
          tabIndex={tab === "forme" ? 0 : -1}
          aria-selected={tab === "forme"}
          className={`${styles.tab} ${tab === "forme" ? styles.tabActive : ""}`}
          onClick={() => setTab("forme")}
        >
          {t("tabs.forme")}
          {formeCount != null && <span className={styles.tabCount}>{formeCount}</span>}
        </button>
      </div>

      {filtersOpen && (
        <div className={styles.filterBackdrop} onClick={() => setFiltersOpen(false)} aria-hidden="true" />
      )}

      <div className={styles.layout}>
        <div className={`${styles.side} ${filtersOpen ? styles.sideOpen : ""}`}>
          <button
            className={styles.filterSheetClose}
            onClick={() => setFiltersOpen(false)}
            aria-label={t("filters.close")}
          >
            <CloseIcon size={14} strokeWidth={2.5} />
            {t("filters.close")}
          </button>
          <Sidebar filters={filters} onChange={setFilters} />
        </div>

        <div className={styles.content}>
          <div className={styles.contentBar}>
            <button
              className={styles.filtersToggle}
              onClick={() => setFiltersOpen((v) => !v)}
            >
              <FilterIcon size={14} strokeWidth={2.2} />
              {t("filters.toggle")}
            </button>
            {browsing && (
              <label className={styles.sortWrap}>
                <span className={styles.sortLabel}>{t("sort.label")}</span>
                <select
                  className={styles.sortSelect}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as JobsSort)}
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
                onClick={() => setViewMode("list")}
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
                onClick={() => setViewMode("grid")}
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

          <div key={tab} id="jobs-tabpanel" role="tabpanel" aria-labelledby={`tab-${tab}`} className={styles.tabContent}>
          {tab === "mine" ? (
            <MyJobs />
          ) : tab === "forme" ? (
            <ForMe
              jobs={allJobs ?? []}
              sources={sourceList}
              loading={allJobsQuery.isLoading}
              error={allJobsQuery.error}
              onRetry={() => allJobsQuery.refetch()}
              onEditProfile={() => navigate("/profile")}
            />
          ) : (
            <main className={viewMode === "grid" ? styles.grid : styles.gridList}>
              {jobsQuery.isError && (
                <div className={styles.alert} role="alert">
                  <strong>{t("error.apiTitle")}</strong>
                  <br />
                  {errorMessage(jobsQuery.error)}
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
                  <SearchIcon size={40} strokeWidth={1.5} />
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
                      total: Math.max(
                        (jobsQuery.data?.pages[0]?.total ?? jobs.length) - hiddenCount,
                        jobs.length,
                      ),
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

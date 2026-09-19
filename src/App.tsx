import { useState } from "react";
import { useTranslation } from "react-i18next";

import { queryTokens, textMatches, textMatchesAny } from "./api/client";
import { useRegionJobs, useSources } from "./api/hooks";
import { ROLES } from "./constants/roles";
import { FilterBar } from "./components/FilterBar/FilterBar";
import { ForMe } from "./components/ForMe/ForMe";
import { Header } from "./components/Header/Header";
import { MyJobs } from "./components/MyJobs/MyJobs";
import { ProfilePanel } from "./components/ProfilePanel/ProfilePanel";
import { SourcesModal } from "./components/SourcesModal/SourcesModal";
import { SourceSection } from "./components/SourceSection/SourceSection";
import { jobId, useJobFlags } from "./lib/jobFlags";
import { useProfile } from "./lib/profile";
import { useSavedJobs } from "./lib/savedJobs";
import type { Filters, Job, SourceInfo } from "./types";
import styles from "./App.module.css";

function App() {
  const { t } = useTranslation();
  const { data: sources } = useSources();
  const [filters, setFilters] = useState<Filters>({ region: "all", q: "" });
  const [showAll, setShowAll] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [tab, setTab] = useState<"company" | "agency" | "mine" | "forme">(
    "company",
  );
  const { items: savedItems } = useSavedJobs();
  const { profile } = useProfile();

  const { data: regionJobs, isLoading, isError, error } = useRegionJobs(
    filters.region,
  );
  const { hideSeen, isOpened } = useJobFlags();

  const sourceList = sources ?? [];
  const tokens = queryTokens(filters.q);

  // Group the region's jobs by source, applying hide-seen once.
  const grouped: Record<string, Job[]> = {};
  for (const job of regionJobs ?? []) {
    if (hideSeen && isOpened(jobId(job.source, job.external_id))) continue;
    (grouped[job.source] ??= []).push(job);
  }

  const allJobs = Object.values(grouped).flat();

  const role = ROLES.find((r) => r.key === filters.role);

  // Role preset OR-matches its keywords; the text search AND-matches its words
  // (a company name in the search shows all that company's jobs).
  const jobsForSource = (s: SourceInfo): Job[] => {
    let list = grouped[s.key] ?? [];
    if (role) {
      list = list.filter((j) =>
        textMatchesAny(`${j.title} ${j.excerpt} ${j.description ?? ""}`, role.terms),
      );
    }
    if (tokens.length > 0 && !textMatches(s.label, tokens)) {
      list = list.filter((j) =>
        textMatches(`${j.title} ${j.excerpt} ${j.description ?? ""}`, tokens),
      );
    }
    return list;
  };

  const items = sourceList
    .map((source) => ({ source, jobs: jobsForSource(source) }))
    .filter((it) => it.jobs.length > 0)
    .sort((a, b) => b.jobs.length - a.jobs.length);

  const companyCount = items.filter((it) => it.source.kind === "company").length;
  const agencyCount = items.filter((it) => it.source.kind === "agency").length;

  const tabItems = items.filter((it) => it.source.kind === tab);

  // Categories present in the current tab, ordered by number of companies.
  const catCounts: Record<string, number> = {};
  for (const it of tabItems) {
    const c = it.source.category ?? "other";
    catCounts[c] = (catCounts[c] ?? 0) + 1;
  }
  const categories = Object.keys(catCounts).sort(
    (a, b) => catCounts[b] - catCounts[a],
  );

  const activeCategory =
    filters.category && categories.includes(filters.category)
      ? filters.category
      : undefined;

  const shown = activeCategory
    ? tabItems.filter((it) => (it.source.category ?? "other") === activeCategory)
    : tabItems;

  const totalOffers = shown.reduce((n, it) => n + it.jobs.length, 0);

  // Region counts (before the keyword filter) for the directory modal.
  const counts = Object.fromEntries(
    sourceList.map((s) => [s.key, (grouped[s.key] ?? []).length]),
  );

  return (
    <div className={styles.app}>
      <Header onOpenProfile={() => setShowProfile(true)} />

      <FilterBar filters={filters} onChange={setFilters} />

      {sourceList.length > 0 && (
        <div className={styles.tabbar}>
          <div className={styles.tabs} role="tablist">
            <button
              role="tab"
              aria-selected={tab === "company"}
              className={`${styles.tab} ${tab === "company" ? styles.tabActive : ""}`}
              onClick={() => {
                setTab("company");
                setFilters((f) => ({ ...f, category: undefined }));
              }}
            >
              {t("tabs.companies")}{" "}
              <span className={styles.tabCount}>{companyCount}</span>
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
              {t("tabs.agencies")}{" "}
              <span className={styles.tabCount}>{agencyCount}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "mine"}
              className={`${styles.tab} ${tab === "mine" ? styles.tabActive : ""}`}
              onClick={() => setTab("mine")}
            >
              {t("tabs.mine")}{" "}
              <span className={styles.tabCount}>{savedItems.length}</span>
            </button>
            <button
              role="tab"
              aria-selected={tab === "forme"}
              className={`${styles.tab} ${tab === "forme" ? styles.tabActive : ""}`}
              onClick={() => setTab("forme")}
            >
              {t("tabs.forme")}
              {profile && profile.skills.length > 0 && (
                <span className={styles.tabCount}>{profile.skills.length}</span>
              )}
            </button>
          </div>
          <button className={styles.allBtn} onClick={() => setShowAll(true)}>
            {t("allCompanies.open", { count: sourceList.length })}
          </button>
        </div>
      )}

      {tab === "company" && categories.length > 1 && (
        <div className={styles.catbar} role="group" aria-label={t("categories.aria")}>
          <button
            type="button"
            className={`${styles.catchip} ${!activeCategory ? styles.catchipActive : ""}`}
            aria-pressed={!activeCategory}
            onClick={() => setFilters((f) => ({ ...f, category: undefined }))}
          >
            {t("categories.all")}{" "}
            <span className={styles.catcount}>{tabItems.length}</span>
          </button>
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              className={`${styles.catchip} ${activeCategory === c ? styles.catchipActive : ""}`}
              aria-pressed={activeCategory === c}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  category: activeCategory === c ? undefined : c,
                }))
              }
            >
              {t(`categories.${c}`)}{" "}
              <span className={styles.catcount}>{catCounts[c]}</span>
            </button>
          ))}
        </div>
      )}

      {tab !== "mine" && tab !== "forme" && sourceList.length > 0 && !isLoading && (
        <p className={styles.stats}>
          {t("stats.summary", {
            offers: totalOffers,
            companies: shown.length,
          })}
        </p>
      )}

      {tab === "mine" ? (
        <MyJobs />
      ) : tab === "forme" ? (
        <ForMe
          jobs={allJobs}
          sources={sourceList}
          onEditProfile={() => setShowProfile(true)}
        />
      ) : (
        <main className={styles.sources}>
          {isError && (
            <div className={styles.alert} role="alert">
              <strong>{t("error.apiTitle")}</strong>
              <br />
              {(error as Error).message}
            </div>
          )}

          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={styles.bootBar} />
            ))}

          {shown.map(({ source, jobs }) => (
            <SourceSection key={source.key} source={source} jobs={jobs} />
          ))}

          {!isLoading && shown.length === 0 && (
            <p className={styles.noResults}>{t("noResults")}</p>
          )}
        </main>
      )}

      <footer className={styles.footer}>{t("footer")}</footer>

      {showAll && (
        <SourcesModal
          sources={sourceList}
          counts={counts}
          onClose={() => setShowAll(false)}
        />
      )}

      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
    </div>
  );
}

export default App;

import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllSourceJobs, useSources } from "./api/hooks";
import { FilterBar } from "./components/FilterBar/FilterBar";
import { Header } from "./components/Header/Header";
import { JobCardSkeleton } from "./components/JobCardSkeleton/JobCardSkeleton";
import { SourcesModal } from "./components/SourcesModal/SourcesModal";
import { SourceSection } from "./components/SourceSection/SourceSection";
import type { Filters } from "./types";
import styles from "./App.module.css";

function App() {
  const { t } = useTranslation();
  const { data: sources, isLoading, isError, error } = useSources();
  const [filters, setFilters] = useState<Filters>({
    region: "jerusalem",
    q: "",
  });
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState<"company" | "agency">("company");

  const sourceList = sources ?? [];
  const queries = useAllSourceJobs(sourceList, filters);
  const items = sourceList.map((source, i) => ({ source, query: queries[i] }));

  // Only show sources that actually have offers (most first). Empty ones are
  // hidden from the main view — reachable via the "all companies" modal.
  const withJobs = items
    .filter((it) => it.query.data && it.query.data.jobs.length > 0)
    .sort((a, b) => (b.query.data?.count ?? 0) - (a.query.data?.count ?? 0));
  const loading = items.filter((it) => it.query.isFetching && !it.query.data);

  const companyCount = withJobs.filter((it) => it.source.kind === "company").length;
  const agencyCount = withJobs.filter((it) => it.source.kind === "agency").length;
  const shown = [...withJobs, ...loading].filter((it) => it.source.kind === tab);

  const counts = Object.fromEntries(
    items.map((it) => [it.source.key, it.query.data?.count ?? 0]),
  );

  return (
    <div className={styles.app}>
      <Header />

      <FilterBar filters={filters} onChange={setFilters} />

      {sourceList.length > 0 && (
        <div className={styles.toolbar}>
          <button className={styles.allBtn} onClick={() => setShowAll(true)}>
            {t("allCompanies.open", { count: sourceList.length })}
          </button>
        </div>
      )}

      <main className={styles.sources}>
        {isError && (
          <div className={styles.alert} role="alert">
            <strong>{t("error.apiTitle")}</strong>
            <br />
            {(error as Error).message}
          </div>
        )}

        {isLoading &&
          Array.from({ length: 2 }).map((_, i) => (
            <section key={i} className={styles.bootSection}>
              <div className={styles.bootBar} />
              <div className={styles.grid}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <JobCardSkeleton key={j} />
                ))}
              </div>
            </section>
          ))}

        {withJobs.map(({ source, query }) => (
          <SourceSection key={source.key} source={source} query={query} />
        ))}

        {loading.map(({ source, query }) => (
          <SourceSection key={source.key} source={source} query={query} />
        ))}

        {!isLoading && withJobs.length === 0 && loading.length === 0 && (
          <p className={styles.noResults}>{t("noResults")}</p>
        )}
      </main>

      <footer className={styles.footer}>{t("footer")}</footer>

      {showAll && (
        <SourcesModal
          sources={sourceList}
          counts={counts}
          onClose={() => setShowAll(false)}
        />
      )}
    </div>
  );
}

export default App;

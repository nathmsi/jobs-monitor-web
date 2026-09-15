import { useState } from "react";
import { useTranslation } from "react-i18next";

import { useAllSourceJobs, useSources } from "./api/hooks";
import { FilterBar } from "./components/FilterBar/FilterBar";
import { Header } from "./components/Header/Header";
import { JobCardSkeleton } from "./components/JobCardSkeleton/JobCardSkeleton";
import { SourceLinkRow } from "./components/SourceLinkRow/SourceLinkRow";
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

  const sourceList = sources ?? [];
  const queries = useAllSourceJobs(sourceList, filters);
  const items = sourceList.map((source, i) => ({ source, query: queries[i] }));

  // Sources with offers first (most first), then loading, empties collapse
  // into a compact "check the site yourself" list at the bottom.
  const withJobs = items
    .filter((it) => it.query.data && it.query.data.jobs.length > 0)
    .sort((a, b) => (b.query.data?.count ?? 0) - (a.query.data?.count ?? 0));
  const loading = items.filter((it) => it.query.isFetching && !it.query.data);
  const empty = items.filter(
    (it) =>
      !(it.query.isFetching && !it.query.data) &&
      !(it.query.data && it.query.data.jobs.length > 0),
  );

  return (
    <div className={styles.app}>
      <Header />

      <FilterBar filters={filters} onChange={setFilters} />

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

        {empty.length > 0 && (
          <div className={styles.empties}>
            <h2 className={styles.emptiesTitle}>{t("source.otherSources")}</h2>
            {empty.map(({ source, query }) => (
              <SourceLinkRow key={source.key} source={source} query={query} />
            ))}
          </div>
        )}
      </main>

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

export default App;

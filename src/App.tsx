import { useTranslation } from "react-i18next";

import { useSources } from "./api/hooks";
import { Header } from "./components/Header/Header";
import { JobCardSkeleton } from "./components/JobCardSkeleton/JobCardSkeleton";
import { SourceSection } from "./components/SourceSection/SourceSection";
import styles from "./App.module.css";

function App() {
  const { t } = useTranslation();
  const { data: sources, isLoading, isError, error } = useSources();

  return (
    <div className={styles.app}>
      <Header />

      <main className={styles.sources}>
        {isError && (
          <div className={styles.alert} role="alert">
            <strong>{t("error.apiTitle")}</strong>
            <br />
            {(error as Error).message}
            <br />
            {t("error.apiHint")}{" "}
            <code>{import.meta.env.VITE_API_URL ?? "http://localhost:8000"}</code>.
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

        {sources?.map((source) => (
          <SourceSection key={source.key} source={source} />
        ))}
      </main>

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

export default App;

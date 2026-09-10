import { useEffect, useState } from "react";
import "./App.css";
import { getSources, refreshSource } from "./api";
import { JobCard } from "./components/JobCard";
import type { Job, SourceInfo } from "./types";

interface SourceState {
  jobs: Job[];
  loading: boolean;
  error: string | null;
  newCount: number;
  lastRefreshed: string | null;
}

const emptyState: SourceState = {
  jobs: [],
  loading: false,
  error: null,
  newCount: 0,
  lastRefreshed: null,
};

function App() {
  const [sources, setSources] = useState<SourceInfo[]>([]);
  const [states, setStates] = useState<Record<string, SourceState>>({});
  const [bootError, setBootError] = useState<string | null>(null);

  useEffect(() => {
    getSources()
      .then((list) => {
        setSources(list);
        setStates(
          Object.fromEntries(list.map((s) => [s.key, { ...emptyState }])),
        );
      })
      .catch((e) => setBootError(String(e)));
  }, []);

  async function handleRefresh(key: string) {
    setStates((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? emptyState), loading: true, error: null },
    }));
    try {
      const result = await refreshSource(key);
      setStates((prev) => ({
        ...prev,
        [key]: {
          jobs: result.jobs,
          loading: false,
          error: null,
          newCount: result.new_count,
          lastRefreshed: new Date().toLocaleTimeString("fr-FR"),
        },
      }));
    } catch (e) {
      setStates((prev) => ({
        ...prev,
        [key]: {
          ...(prev[key] ?? emptyState),
          loading: false,
          error: String(e),
        },
      }));
    }
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Veille d'offres · Israël</h1>
        <p className="app__subtitle">
          Full Stack · React / TypeScript · Jérusalem
        </p>
      </header>

      {bootError && (
        <div className="alert">
          Impossible de contacter l'API : {bootError}
          <br />
          Le backend tourne-t-il sur <code>http://localhost:8000</code> ?
        </div>
      )}

      <section className="sources">
        {sources.map((s) => {
          const st = states[s.key] ?? emptyState;
          return (
            <div key={s.key} className="source">
              <div className="source__bar">
                <div className="source__title">
                  <h2>{s.label}</h2>
                  {st.lastRefreshed && (
                    <span className="source__meta">
                      {st.jobs.length} offres · {st.newCount} nouvelle
                      {st.newCount > 1 ? "s" : ""} · maj {st.lastRefreshed}
                    </span>
                  )}
                </div>
                <div className="source__actions">
                  {s.site_url && (
                    <a
                      className="btn btn--ghost"
                      href={s.site_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Ouvrir le site ↗
                    </a>
                  )}
                  <button
                    className="btn"
                    onClick={() => handleRefresh(s.key)}
                    disabled={st.loading}
                  >
                    {st.loading ? "Chargement…" : "Rafraîchir"}
                  </button>
                </div>
              </div>

              {st.error && <div className="alert">Erreur : {st.error}</div>}

              <div className="jobs">
                {st.jobs.map((job) => (
                  <JobCard key={`${job.source}-${job.external_id}`} job={job} />
                ))}
              </div>

              {!st.loading &&
                !st.error &&
                st.lastRefreshed &&
                st.jobs.length === 0 && (
                  <p className="source__empty">
                    Aucune offre récupérée automatiquement.
                    {s.site_url && (
                      <>
                        {" "}
                        <a href={s.site_url} target="_blank" rel="noreferrer">
                          Voir directement sur le site ↗
                        </a>
                      </>
                    )}
                  </p>
                )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default App;

import { useEffect, useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { analyzeCvAi, matchCv, type CvAnalysis, type MatchedOffer } from "../api/client";
import { Header } from "../components/Header/Header";
import { useAuth } from "../lib/auth";
import { useCvs } from "../lib/cvs";
import styles from "./CoachPage.module.css";

type SubTab = "review" | "match";

const sevClass: Record<string, string> = {
  high: styles.sevHigh,
  medium: styles.sevMedium,
  low: styles.sevLow,
};

/**
 * CV Analysis hub: pick a saved CV (per-user library) once, then use it in two
 * sub-tabs — "Review" (improve my CV) and "Match" (best offers, WIP).
 */
export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { ready, cvs, selectedCv, selectedId, selectCv, addCv, removeCv } = useCvs();

  const [goal, setGoal] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<SubTab>("review");

  const cvText = selectedCv?.text ?? "";
  const isReady = cvText.trim().length >= 50;

  const onPdf = async (file: File) => {
    setBusyPdf(true);
    setPdfError(null);
    try {
      const { extractPdfText } = await import("../lib/pdf");
      const text = await extractPdfText(file);
      const name = file.name.replace(/\.pdf$/i, "").slice(0, 60) || "CV";
      await addCv(name, text);
    } catch {
      setPdfError(t("coach.pdfError"));
    } finally {
      setBusyPdf(false);
    }
  };

  const pickPdf = () => fileRef.current?.click();

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.intro}>
        <h1 className={styles.title}>{t("coach.hubTitle")}</h1>
        <p className={styles.lead}>{t("coach.hubLead")}</p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onPdf(f);
          e.target.value = "";
        }}
      />

      {!user ? (
        <div className={styles.card}>
          <h2 className={styles.h2}>{t("coach.signIn.title")}</h2>
          <p className={styles.lead}>{t("coach.signIn.lead")}</p>
          <div className={styles.actionsBar}>
            <button className={styles.analyzeBtn} onClick={() => signInWithGoogle()}>
              {t("coach.signIn.button")}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.card}>
          <div className={styles.libHead}>
            <label className={styles.label}>{t("coach.library.title")}</label>
            <button
              type="button"
              className={styles.fileBtn}
              disabled={busyPdf}
              onClick={pickPdf}
            >
              ＋ {busyPdf ? t("coach.library.adding") : t("coach.library.add")}
            </button>
          </div>

          {ready && cvs.length === 0 ? (
            <div
              className={styles.emptyLib}
              onClick={pickPdf}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f && f.type === "application/pdf") onPdf(f);
              }}
            >
              📄 {t("coach.library.none")}
            </div>
          ) : (
            <div className={styles.cvPicker}>
              <select
                className={styles.goal}
                value={selectedId ?? ""}
                onChange={(e) => selectCv(e.target.value)}
              >
                {cvs.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              {selectedCv && (
                <button
                  type="button"
                  className={styles.deleteBtn}
                  onClick={() => removeCv(selectedCv.id)}
                  title={t("coach.library.delete")}
                >
                  🗑
                </button>
              )}
            </div>
          )}

          {selectedCv && (
            <p className={styles.cvPreview}>{selectedCv.text.slice(0, 240)}…</p>
          )}
          {pdfError && <span className={styles.error}>⚠ {pdfError}</span>}

          <label className={styles.label} style={{ marginTop: "1rem" }}>
            {t("coach.goalLabel")}
          </label>
          <input
            className={styles.goal}
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={t("coach.goalPlaceholder")}
          />
          <p className={styles.privacy}>🔒 {t("coach.privacy")}</p>
        </div>
      )}

      {/* Sub-tabs */}
      <div className={styles.subTabs} role="tablist">
        <button
          role="tab"
          aria-selected={tab === "review"}
          className={`${styles.subTab} ${tab === "review" ? styles.subTabActive : ""}`}
          onClick={() => setTab("review")}
        >
          📝 {t("coach.tabReview")}
        </button>
        <button
          role="tab"
          aria-selected={tab === "match"}
          className={`${styles.subTab} ${tab === "match" ? styles.subTabActive : ""}`}
          onClick={() => setTab("match")}
        >
          🎯 {t("coach.tabMatch")}
        </button>
      </div>

      {tab === "review" ? (
        <ReviewTab cv={cvText} goal={goal} ready={isReady} lang={i18n.language} />
      ) : (
        <MatchTab cv={cvText} ready={isReady} onAdapt={() => setTab("review")} />
      )}

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

/* ------------------------------- Review tab ------------------------------- */

function ReviewTab({
  cv,
  goal,
  ready,
  lang,
}: {
  cv: string;
  goal: string;
  ready: boolean;
  lang: string;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvAnalysis | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const steps = t("coach.loadingSteps", { returnObjects: true }) as string[];
  useEffect(() => {
    if (!busy) {
      setStepIdx(0);
      return;
    }
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2500);
    return () => clearInterval(id);
  }, [busy, steps.length]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await analyzeCvAi(cv.trim(), goal.trim(), lang));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.actionsBar}>
        {error && <span className={styles.error}>⚠ {error}</span>}
        <button className={styles.analyzeBtn} disabled={busy || !ready} onClick={run}>
          {busy ? t("coach.analyzing") : t("coach.analyze")}
        </button>
      </div>
      {busy && <LoadingPanel message={steps[stepIdx] ?? ""} />}
      {result && !busy && <Analysis a={result} />}
    </>
  );
}

/* -------------------------------- Match tab ------------------------------- */

const MATCH_STEP_MS = 2500;

function MatchTab({
  cv,
  ready,
  onAdapt,
}: {
  cv: string;
  ready: boolean;
  onAdapt: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchedOffer[] | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const steps = t("coach.match.loadingSteps", { returnObjects: true }) as string[];
  useEffect(() => {
    if (!busy) {
      setStepIdx(0);
      return;
    }
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), MATCH_STEP_MS);
    return () => clearInterval(id);
  }, [busy, steps.length]);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResults(await matchCv(cv.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className={styles.actionsBar}>
        {error && <span className={styles.error}>⚠ {error}</span>}
        <button className={styles.analyzeBtn} disabled={busy || !ready} onClick={run}>
          🎯 {busy ? t("coach.analyzing") : t("coach.match.cta")}
        </button>
      </div>
      {!results && !busy && (
        <div className={styles.card}>
          <p className={styles.lead}>{t("coach.match.lead")}</p>
        </div>
      )}

      {busy && <MatchLoadingPanel message={steps[stepIdx] ?? ""} />}

      {results && !busy && (
        <div className={styles.grid2}>
          {results.length === 0 && (
            <p className={styles.empty}>{t("coach.match.none")}</p>
          )}
          {results.map((o) => (
            <div className={styles.card} key={o.id}>
              <div className={styles.previewHead}>
                <span className={styles.previewLogo} aria-hidden />
                <span className={styles.previewScore}>{o.score}</span>
              </div>
              <div className={styles.headline}>{o.title}</div>
              <div className={styles.metaLine}>
                <span className={styles.chip}>{o.company}</span>
              </div>
              <div className={styles.previewReasons}>
                <span className={styles.previewChip}>{t("coach.match.why")}</span>
                <ul className={styles.list}>
                  {o.reasons.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
                {o.weak_points.length > 0 && (
                  <>
                    <span className={styles.previewChip}>{t("coach.gaps")}</span>
                    <ul className={styles.list}>
                      {o.weak_points.map((w, i) => (
                        <li key={i} className={styles.evidence}>
                          {w}
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
              <div className={styles.previewFoot}>
                <button type="button" className={styles.previewGhost} onClick={onAdapt}>
                  {t("coach.match.adapt")}
                </button>
                {o.url && (
                  <a
                    className={styles.previewGhost}
                    href={o.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t("coach.match.view")}
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!ready && <p className={styles.note}>{t("coach.match.needCv")}</p>}
    </>
  );
}

function MatchLoadingPanel({ message }: { message: string }) {
  return (
    <div aria-live="polite" aria-busy>
      <div className={styles.card}>
        <div className={styles.loadingHead}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.loadingMsg} key={message}>
            {message}
          </span>
        </div>
      </div>
      <div className={styles.grid2}>
        {[0, 1, 2, 3].map((i) => (
          <div className={`${styles.card} ${styles.previewCard}`} key={i}>
            <div className={styles.previewHead}>
              <span className={styles.previewLogo} />
              <span className={styles.skelCircle} style={{ width: 38, height: 38 }} />
            </div>
            <span className={styles.skel} style={{ width: "70%" }} />
            <span className={styles.skel} style={{ width: "45%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------ Shared views ------------------------------ */

function LoadingPanel({ message }: { message: string }) {
  return (
    <div className={styles.result} aria-live="polite" aria-busy>
      <div className={styles.card}>
        <div className={styles.loadingHead}>
          <span className={styles.spinner} aria-hidden />
          <span className={styles.loadingMsg} key={message}>
            {message}
          </span>
        </div>
        <div className={styles.skelScoreRow}>
          <span className={styles.skelCircle} />
          <div className={styles.skelLines}>
            <span className={styles.skel} style={{ width: "70%" }} />
            <span className={styles.skel} style={{ width: "45%" }} />
          </div>
        </div>
      </div>
      <div className={styles.grid2}>
        {[0, 1].map((i) => (
          <div className={styles.card} key={i}>
            <span className={styles.skel} style={{ width: "40%", height: 14 }} />
            <span className={styles.skel} style={{ width: "90%" }} />
            <span className={styles.skel} style={{ width: "80%" }} />
            <span className={styles.skel} style={{ width: "85%" }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Analysis({ a }: { a: CvAnalysis }) {
  const { t } = useTranslation();
  return (
    <div className={styles.result}>
      <div className={styles.card}>
        <div className={styles.scoreRow}>
          <div className={styles.scoreBadge}>{a.overall?.score ?? "—"}</div>
          <div>
            <div className={styles.headline}>{a.snapshot?.headline}</div>
            <div className={styles.metaLine}>
              <span className={styles.pill}>{a.snapshot?.current_level}</span>
              <span className={styles.pill}>
                {t("coach.yrs", { count: a.snapshot?.years_experience ?? 0 })}
              </span>
              {(a.snapshot?.domains ?? []).slice(0, 5).map((d) => (
                <span key={d} className={styles.chip}>
                  {d}
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className={styles.summary}>{a.overall?.summary}</p>
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>{t("coach.target")}</h2>
        <div className={styles.metaLine}>
          {(a.target?.roles ?? []).map((r) => (
            <span key={r} className={styles.chipStrong}>
              {r}
            </span>
          ))}
        </div>
        <div className={styles.targetMeta}>
          <span>
            <strong>{a.target?.seniority}</strong> · {a.target?.years_to_target}
          </span>
          <span className={styles.readiness}>
            <span className={styles.readinessBar}>
              <span
                className={styles.readinessFill}
                style={{ width: `${a.target?.readiness_pct ?? 0}%` }}
              />
            </span>
            {a.target?.readiness_pct ?? 0}% {t("coach.ready")}
          </span>
        </div>
        {a.target?.assumptions && (
          <p className={styles.note}>{t("coach.assumed")}: {a.target.assumptions}</p>
        )}
      </div>

      <div className={styles.grid2}>
        <ListCard title={t("coach.strengths")} tone="good">
          {(a.strengths ?? []).map((s, i) => (
            <li key={i}>
              <strong>{s.point}</strong>
              <span className={styles.evidence}>{s.evidence}</span>
            </li>
          ))}
        </ListCard>

        <ListCard title={t("coach.gaps")} tone="warn">
          {(a.gaps ?? []).map((g, i) => (
            <li key={i}>
              <span className={`${styles.sev} ${sevClass[g.severity] ?? ""}`}>
                {g.severity}
              </span>
              <strong>{g.gap}</strong>
              <span className={styles.evidence}>{g.why_it_matters}</span>
            </li>
          ))}
        </ListCard>
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>{t("coach.cvFeedback")}</h2>
        <ul className={styles.list}>
          {(a.cv_feedback ?? []).map((f, i) => (
            <li key={i}>
              <strong>{f.issue}</strong>
              <span className={styles.evidence}>{f.fix}</span>
              {f.example && <span className={styles.example}>“{f.example}”</span>}
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>{t("coach.skills")}</h2>
        <ul className={styles.list}>
          {(a.skills_to_learn ?? []).map((s, i) => (
            <li key={i}>
              <strong>{s.skill}</strong>
              <span className={styles.evidence}>{s.reason}</span>
              <span className={styles.example}>{s.how}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.card}>
        <h2 className={styles.h2}>{t("coach.plan")}</h2>
        <div className={styles.grid3}>
          <Plan title={t("coach.d30")} items={a.action_plan?.next_30_days} />
          <Plan title={t("coach.d90")} items={a.action_plan?.next_90_days} />
          <Plan title={t("coach.m6")} items={a.action_plan?.next_6_months} />
        </div>
      </div>

      {(a.keywords_missing ?? []).length > 0 && (
        <div className={styles.card}>
          <h2 className={styles.h2}>{t("coach.keywords")}</h2>
          <div className={styles.metaLine}>
            {a.keywords_missing.map((k) => (
              <span key={k} className={styles.kw}>
                {k}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ListCard({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "good" | "warn";
  children: ReactNode;
}) {
  return (
    <div className={styles.card}>
      <h2 className={`${styles.h2} ${tone === "good" ? styles.good : styles.warn}`}>{title}</h2>
      <ul className={styles.list}>{children}</ul>
    </div>
  );
}

function Plan({ title, items }: { title: string; items?: string[] }) {
  return (
    <div className={styles.planCol}>
      <div className={styles.planTitle}>{title}</div>
      <ul className={styles.planList}>
        {(items ?? []).map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

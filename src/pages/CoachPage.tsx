import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { analyzeCvAi, type CvAnalysis, type MatchedOffer } from "../api/client";
import { consumeMatchStream } from "../api/stream";
import { AgentWorkflow } from "../components/AgentWorkflow/AgentWorkflow";
import { MatchResults } from "../components/MatchResults/MatchResults";
import { CVAnalysisResults } from "../components/CVAnalysisResults/CVAnalysisResults";
import { CVUploadModal } from "../components/CVUploadModal/CVUploadModal";
import { Header } from "../components/Header/Header";
import { useAuth } from "../lib/auth";
import { useCvs } from "../lib/cvs";
import { useCvUpload } from "../lib/useCvUpload";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import { usePreferences } from "../lib/preferences";
import { useRegions } from "../api/hooks";
import styles from "./CoachPage.module.css";

type ActiveFeature = "review" | "match" | null;

export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { selectedCv, addCv, cvs, selectedId, selectCv } = useCvs();
  const { prefs } = usePreferences();

  const [goal, setGoal] = useState("");
  const [active, setActive] = useState<ActiveFeature>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const cvText = selectedCv?.text ?? "";
  const isReady = cvText.trim().length >= 50;

  const cvUpload = useCvUpload(addCv);
  const onPdf = async (file: File) => {
    if (await cvUpload.upload(file)) setShowUploadModal(false);
  };

  useDocumentTitle("coach.nav");

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.page}>
        {/* Page title */}
        <div className={styles.pageTitle}>
          <h1 className={styles.title}>{t("coach.nav")}</h1>
          <p className={styles.lead}>{t("coach.tagline")}</p>
        </div>

        {/* Not signed in */}
        {!user && (
          <div className={styles.hero}>
            <p className={styles.heroEyebrow}>{t("coach.getStarted")}</p>
            <h2 className={styles.heroTitle}>{t("coach.heroTitle")}</h2>
            <p className={styles.heroDesc}>{t("coach.heroDesc")}</p>
            <button className={styles.primaryBtn} onClick={() => signInWithGoogle()}>
              {t("coach.signIn.button")}
            </button>
          </div>
        )}

        {/* Signed in */}
        {user && (
          <>
            {/* CV context bar */}
            <div className={styles.cvBar}>
              {isReady ? (
                <>
                  <div className={styles.cvBarInfo}>
                    <span className={styles.cvDot} />
                    <span className={styles.cvBarName}>{selectedCv?.name ?? t("coach.defaultCvName")}</span>
                    <span className={styles.cvBarReady}>{t("coach.cvReadyLabel")}</span>
                  </div>
                  <button className={styles.cvBarChange} onClick={() => setShowUploadModal(true)}>
                    {t("coach.changeCv")}
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.cvBarEmpty}>{t("coach.noCv")}</span>
                  <button className={styles.primaryBtn} onClick={() => setShowUploadModal(true)}>
                    {t("coach.uploadCv")}
                  </button>
                </>
              )}
            </div>

            {/* Goal input — visible when CV is ready but no feature active */}
            {isReady && !active && (
              <div className={styles.goalRow}>
                <label className={styles.goalLabel} htmlFor="coachGoal">{t("coach.goalLabel")}</label>
                <input
                  id="coachGoal"
                  className={styles.goalInput}
                  type="text"
                  placeholder={t("coach.goalPlaceholder")}
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  maxLength={200}
                />
              </div>
            )}

            {/* Feature cards — always visible */}
            {isReady && !active && (
              <div className={styles.featureGrid}>
                <button className={styles.featureCard} onClick={() => setActive("review")}>
                  <div className={styles.featureIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureReviewTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureReviewDesc")}</p>
                  <span className={styles.featureCta}>{t("coach.featureReviewCta")}</span>
                </button>

                <button className={styles.featureCard} onClick={() => setActive("match")}>
                  <div className={styles.featureIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureMatchTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureMatchDesc")}</p>
                  <span className={styles.featureCta}>{t("coach.featureMatchCta")}</span>
                </button>
              </div>
            )}

            {/* No CV — prompt */}
            {!isReady && (
              <div className={styles.featureGrid}>
                <div className={`${styles.featureCard} ${styles.featureCardDisabled}`}>
                  <div className={styles.featureIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureReviewTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureReviewDesc")}</p>
                  <span className={styles.featureCtaDisabled}>{t("coach.uploadUnlock")}</span>
                </div>
                <div className={`${styles.featureCard} ${styles.featureCardDisabled}`}>
                  <div className={styles.featureIcon}>
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureMatchTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureMatchDesc")}</p>
                  <span className={styles.featureCtaDisabled}>{t("coach.uploadUnlock")}</span>
                </div>
              </div>
            )}

            {/* Active feature content */}
            {active === "review" && (
              <ReviewFeature
                cv={cvText}
                goal={goal}
                lang={i18n.language}
                onBack={() => setActive(null)}
              />
            )}

            {active === "match" && (
              <MatchFeature
                cv={cvText}
                filters={{ region: prefs.region, kind: prefs.kind === "all" ? undefined : prefs.kind }}
                onAdapt={() => setActive("review")}
                onBack={() => setActive(null)}
              />
            )}
          </>
        )}
      </div>

      <footer className={styles.footer}>{t("footer")}</footer>

      <CVUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={onPdf}
        busy={cvUpload.busy}
        error={cvUpload.error}
        existingCvs={cvs}
        selectedCvId={selectedId ?? undefined}
        onSelectCv={selectCv}
      />
    </div>
  );
}

/* ─────────────────────────── Review feature ─────────────────────────── */

function ReviewFeature({ cv, goal, lang, onBack }: { cv: string; goal: string; lang: string; onBack: () => void }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvAnalysis | null>(null);
  const [stepIdx, setStepIdx] = useState(0);

  const steps = t("coach.loadingSteps", { returnObjects: true }) as string[];

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2500);
    return () => clearInterval(id);
  }, [busy, steps.length]);

  const abortRef = useRef<AbortController | null>(null);

  const run = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setStepIdx(0);
    setError(null);
    setResult(null);
    try {
      const analysis = await analyzeCvAi(cv.trim(), goal.trim(), lang, ctrl.signal);
      if (!ctrl.signal.aborted) setResult(analysis);
    } catch (e) {
      if (!ctrl.signal.aborted) setError((e as Error).message);
    } finally {
      if (!ctrl.signal.aborted) setBusy(false);
    }
  };

  // Auto-launch once on mount; abort the in-flight request on unmount (also
  // makes the StrictMode double-mount cancel its first request).
  const autoRun = useEffectEvent(run);
  useEffect(() => {
    void autoRun();
    return () => abortRef.current?.abort();
  }, []);

  return (
    <div className={styles.featureContent}>
      <div className={styles.featureContentHeader}>
        <button className={styles.backBtn} onClick={onBack}>{t("coach.back")}</button>
        <span className={styles.featureContentTitle}>{t("coach.analysisTitle")}</span>
        {result && !busy && (
          <button className={styles.rerunBtn} onClick={run}>{t("coach.runAgain")}</button>
        )}
      </div>

      {busy && (
        <div className={styles.loadingState}>
          <span className={styles.spinner} />
          <span className={styles.loadingMsg} key={stepIdx}>{steps[stepIdx] ?? ""}</span>
        </div>
      )}

      {error && (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryBtn} onClick={run}>{t("error.tryAgain")}</button>
        </div>
      )}

      {result && !busy && <CVAnalysisResults analysis={result} />}
    </div>
  );
}

/* ─────────────────────────── Match feature ─────────────────────────── */

function MatchFeature({ cv, filters: defaultFilters = {}, onAdapt, onBack }: {
  cv: string;
  filters?: { region?: string; kind?: string };
  onAdapt: () => void;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  const { data: regions } = useRegions();

  const [localFilters, setLocalFilters] = useState({
    region: defaultFilters.region ?? "all",
    kind: (defaultFilters.kind ?? "all") as "all" | "company" | "agency",
  });

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchedOffer[] | null>(null);
  const [currentTool, setCurrentTool] = useState<string | undefined>();
  const [hasRun, setHasRun] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const run = async () => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setBusy(true);
    setError(null);
    setResults(null);
    setCurrentTool(undefined);
    setHasRun(true);
    const activeFilters = {
      region: localFilters.region !== "all" ? localFilters.region : undefined,
      kind: localFilters.kind !== "all" ? localFilters.kind : undefined,
    };
    try {
      const results = await consumeMatchStream(cv.trim(), activeFilters, {
        onToolCall: (name) => setCurrentTool(name),
        onToolResult: () => {},
        onFinal: () => setCurrentTool("final"),
      }, ctrl.signal);
      if (!ctrl.signal.aborted) setResults(results);
    } catch (e) {
      if (!ctrl.signal.aborted) setError((e as Error).message);
    } finally {
      if (!ctrl.signal.aborted) {
        setBusy(false);
        setCurrentTool(undefined);
      }
    }
  };

  return (
    <div className={styles.featureContent}>
      <div className={styles.featureContentHeader}>
        <button className={styles.backBtn} onClick={onBack}>{t("coach.back")}</button>
        <span className={styles.featureContentTitle}>{t("coach.matchTitle")}</span>
        {hasRun && !busy && (
          <button className={styles.rerunBtn} onClick={run}>{t("coach.searchAgain")}</button>
        )}
      </div>

      {/* Search filters — always visible; disabled while running */}
      <div className={styles.matchFilters}>
        <div className={styles.matchFilterGroup}>
          <label className={styles.matchFilterLabel}>{t("filters.regionLabel")}</label>
          <select
            className={styles.matchFilterSelect}
            value={localFilters.region}
            disabled={busy}
            onChange={(e) => setLocalFilters((f) => ({ ...f, region: e.target.value }))}
          >
            <option value="all">{t("categories.all")}</option>
            {(regions ?? []).map((r) => (
              <option key={r.key} value={r.key}>{r.label_en}</option>
            ))}
          </select>
        </div>

        <div className={styles.matchFilterGroup}>
          <label className={styles.matchFilterLabel}>{t("profile.prefKind")}</label>
          <div className={styles.matchKindChips}>
            {(["all", "company", "agency"] as const).map((k) => (
              <button
                key={k}
                type="button"
                disabled={busy}
                className={`${styles.matchKindChip} ${localFilters.kind === k ? styles.matchKindChipOn : ""}`}
                onClick={() => setLocalFilters((f) => ({ ...f, kind: k }))}
              >
                {t(`profile.kind_${k}`)}
              </button>
            ))}
          </div>
        </div>
        {!hasRun && (
          <div className={styles.matchFilterGroup}>
            <button className={styles.primaryBtn} onClick={run}>{t("agent.launchBtn")}</button>
          </div>
        )}
      </div>

      {busy && <AgentWorkflow currentTool={currentTool} />}

      {error && (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryBtn} onClick={run}>{t("coach.searchAgain")}</button>
        </div>
      )}

      {results && !busy && <MatchResults offers={results} onAdapt={onAdapt} />}
    </div>
  );
}

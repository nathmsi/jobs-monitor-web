import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { analyzeCvAi, type MatchedOffer } from "../api/client";
import { consumeMatchStream } from "../api/stream";
import { AgentWorkflow } from "../components/AgentWorkflow/AgentWorkflow";
import { MatchResults } from "../components/MatchResults/MatchResults";
import { CVAnalysisResults } from "../components/CVAnalysisResults/CVAnalysisResults";
import { CVUploadModal } from "../components/CVUploadModal/CVUploadModal";
import { Header } from "../components/Header/Header";
import { useAuth } from "../providers/auth/useAuth";
import { useCvs } from "../hooks/useCvs";
import { errorMessage } from "../utils/errorMessage";
import { regionLabel } from "../utils/regionLabel";
import { useCvUpload } from "../hooks/useCvUpload";
import { useDocumentTitle } from "../hooks/useDocumentTitle";
import { usePreferences } from "../providers/preferences/usePreferences";
import { useRegions } from "../api/hooks";
import { DocumentIcon, SearchPlusIcon } from "../components/Icons/Icons";
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
                    <DocumentIcon size={28} strokeWidth={1.7} />
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureReviewTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureReviewDesc")}</p>
                  <span className={styles.featureCta}>{t("coach.featureReviewCta")}</span>
                </button>

                <button className={styles.featureCard} onClick={() => setActive("match")}>
                  <div className={styles.featureIcon}>
                    <SearchPlusIcon size={28} strokeWidth={1.7} />
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
                    <DocumentIcon size={28} strokeWidth={1.7} />
                  </div>
                  <h3 className={styles.featureTitle}>{t("coach.featureReviewTitle")}</h3>
                  <p className={styles.featureDesc}>{t("coach.featureReviewDesc")}</p>
                  <span className={styles.featureCtaDisabled}>{t("coach.uploadUnlock")}</span>
                </div>
                <div className={`${styles.featureCard} ${styles.featureCardDisabled}`}>
                  <div className={styles.featureIcon}>
                    <SearchPlusIcon size={28} strokeWidth={1.7} />
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
  const [stepIdx, setStepIdx] = useState(0);

  // react-query aborts the request when the feature unmounts, de-duplicates the
  // StrictMode double mount, and reuses a finished analysis for the same inputs.
  const analysis = useQuery({
    queryKey: ["cv-analysis", cv.trim(), goal.trim(), lang],
    queryFn: ({ signal }) => analyzeCvAi(cv.trim(), goal.trim(), lang, signal),
    staleTime: Infinity,
    retry: false,
  });
  const busy = analysis.isFetching;
  const result = analysis.data ?? null;
  const error = analysis.isError ? errorMessage(analysis.error) : null;
  const run = () => {
    setStepIdx(0);
    void analysis.refetch();
  };

  const steps = t("coach.loadingSteps", { returnObjects: true }) as string[];

  useEffect(() => {
    if (!busy) return;
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2500);
    return () => clearInterval(id);
  }, [busy, steps.length]);

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
  const { t, i18n } = useTranslation();
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
      if (!ctrl.signal.aborted) setError(errorMessage(e));
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
          <label className={styles.matchFilterLabel} htmlFor="matchRegion">{t("filters.regionLabel")}</label>
          <select
            id="matchRegion"
            className={styles.matchFilterSelect}
            value={localFilters.region}
            disabled={busy}
            onChange={(e) => setLocalFilters((f) => ({ ...f, region: e.target.value }))}
          >
            <option value="all">{t("categories.all")}</option>
            {(regions ?? []).map((r) => (
              <option key={r.key} value={r.key}>{regionLabel(r, i18n.language)}</option>
            ))}
          </select>
        </div>

        <div className={styles.matchFilterGroup}>
          <span className={styles.matchFilterLabel} id="matchKindLabel">{t("profile.prefKind")}</span>
          <div className={styles.matchKindChips} role="group" aria-labelledby="matchKindLabel">
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

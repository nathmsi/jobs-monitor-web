import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { analyzeCvAi, matchCv, type CvAnalysis, type MatchedOffer } from "../api/client";
import { consumeMatchStream } from "../api/stream";
import { AgentWorkflow } from "../components/AgentWorkflow/AgentWorkflow";
import { MatchResults } from "../components/MatchResults/MatchResults";
import { CVAnalysisResults } from "../components/CVAnalysisResults/CVAnalysisResults";
import { CVUploadModal } from "../components/CVUploadModal/CVUploadModal";
import { Header } from "../components/Header/Header";
import { useAuth } from "../lib/auth";
import { useCvs } from "../lib/cvs";
import styles from "./CoachPage.module.css";

type ActiveFeature = "review" | "match" | null;

export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { selectedCv, addCv, cvs, selectedId, selectCv } = useCvs();

  const [goal] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [active, setActive] = useState<ActiveFeature>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

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
      setShowUploadModal(false);
    } catch {
      setPdfError(t("coach.pdfError"));
    } finally {
      setBusyPdf(false);
    }
  };

  return (
    <div className={styles.app}>
      <Header />

      <div className={styles.page}>
        {/* Page title */}
        <div className={styles.pageTitle}>
          <h1 className={styles.title}>CV Coach</h1>
          <p className={styles.lead}>Your AI-powered career companion</p>
        </div>

        {/* Not signed in */}
        {!user && (
          <div className={styles.hero}>
            <p className={styles.heroEyebrow}>Get started</p>
            <h2 className={styles.heroTitle}>Unlock your career potential</h2>
            <p className={styles.heroDesc}>
              Upload your CV once and get a deep AI review of your strengths, gaps, and action plan — plus a personalised list of jobs that match your profile.
            </p>
            <button className={styles.primaryBtn} onClick={() => signInWithGoogle()}>
              Sign in with Google
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
                    <span className={styles.cvBarName}>{selectedCv?.name ?? "Your CV"}</span>
                    <span className={styles.cvBarReady}>Ready</span>
                  </div>
                  <button className={styles.cvBarChange} onClick={() => setShowUploadModal(true)}>
                    Change CV
                  </button>
                </>
              ) : (
                <>
                  <span className={styles.cvBarEmpty}>No CV uploaded yet</span>
                  <button className={styles.primaryBtn} onClick={() => setShowUploadModal(true)}>
                    Upload my CV
                  </button>
                </>
              )}
            </div>

            {/* Feature cards — always visible */}
            {isReady && !active && (
              <div className={styles.featureGrid}>
                <button
                  className={styles.featureCard}
                  onClick={() => setActive("review")}
                >
                  <div className={styles.featureIcon}>◈</div>
                  <h3 className={styles.featureTitle}>Analyze my CV</h3>
                  <p className={styles.featureDesc}>
                    Get a detailed review: your level, strengths, gaps to close, and a concrete 6-month action plan.
                  </p>
                  <span className={styles.featureCta}>Get my review →</span>
                </button>

                <button
                  className={styles.featureCard}
                  onClick={() => setActive("match")}
                >
                  <div className={styles.featureIcon}>◉</div>
                  <h3 className={styles.featureTitle}>Find matching jobs</h3>
                  <p className={styles.featureDesc}>
                    Our AI agent reads your CV, searches all available jobs, and ranks the top matches with an explanation.
                  </p>
                  <span className={styles.featureCta}>Find my jobs →</span>
                </button>
              </div>
            )}

            {/* No CV — prompt */}
            {!isReady && (
              <div className={styles.featureGrid}>
                <div className={`${styles.featureCard} ${styles.featureCardDisabled}`}>
                  <div className={styles.featureIcon}>◈</div>
                  <h3 className={styles.featureTitle}>Analyze my CV</h3>
                  <p className={styles.featureDesc}>Upload your CV to get a detailed AI review.</p>
                  <span className={styles.featureCtaDisabled}>Upload CV to unlock</span>
                </div>
                <div className={`${styles.featureCard} ${styles.featureCardDisabled}`}>
                  <div className={styles.featureIcon}>◉</div>
                  <h3 className={styles.featureTitle}>Find matching jobs</h3>
                  <p className={styles.featureDesc}>Upload your CV and let AI find the best job matches for you.</p>
                  <span className={styles.featureCtaDisabled}>Upload CV to unlock</span>
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
        busy={busyPdf}
        error={pdfError}
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
    if (!busy) { setStepIdx(0); return; }
    const id = setInterval(() => setStepIdx((i) => (i + 1) % steps.length), 2500);
    return () => clearInterval(id);
  }, [busy, steps.length]);

  // Auto-launch on mount
  useEffect(() => {
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      setResult(await analyzeCvAi(cv.trim(), goal.trim(), lang));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.featureContent}>
      <div className={styles.featureContentHeader}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <span className={styles.featureContentTitle}>CV Analysis</span>
        {result && !busy && (
          <button className={styles.rerunBtn} onClick={run}>Run again</button>
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
          <button className={styles.primaryBtn} onClick={run}>Try again</button>
        </div>
      )}

      {result && !busy && <CVAnalysisResults analysis={result} />}
    </div>
  );
}

/* ─────────────────────────── Match feature ─────────────────────────── */

function MatchFeature({ cv, onAdapt, onBack }: { cv: string; onAdapt: () => void; onBack: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MatchedOffer[] | null>(null);
  const [currentTool, setCurrentTool] = useState<string | undefined>();

  // Auto-launch on mount
  useEffect(() => {
    run();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const run = async () => {
    setBusy(true);
    setError(null);
    setResults(null);
    setCurrentTool(undefined);
    try {
      await consumeMatchStream(cv.trim(), {}, {
        onToolCall: (name) => setCurrentTool(name),
        onToolResult: () => {},
        onFinal: () => setCurrentTool("final"),
      });
      setResults(await matchCv(cv.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setCurrentTool(undefined);
    }
  };

  return (
    <div className={styles.featureContent}>
      <div className={styles.featureContentHeader}>
        <button className={styles.backBtn} onClick={onBack}>← Back</button>
        <span className={styles.featureContentTitle}>Job Matches</span>
        {results && !busy && (
          <button className={styles.rerunBtn} onClick={run}>Search again</button>
        )}
      </div>

      {busy && <AgentWorkflow currentTool={currentTool} />}

      {error && (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button className={styles.primaryBtn} onClick={run}>Try again</button>
        </div>
      )}

      {results && !busy && <MatchResults offers={results} onAdapt={onAdapt} />}
    </div>
  );
}

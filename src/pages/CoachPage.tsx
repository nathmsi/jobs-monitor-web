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

type SubTab = "review" | "match";

/**
 * CV Analysis hub: pick a saved CV (per-user library) once, then use it in two
 * sub-tabs — "Review" (improve my CV) and "Match" (best offers, WIP).
 */
export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { selectedCv, addCv } = useCvs();

  const [goal, setGoal] = useState("");
  const [busyPdf, setBusyPdf] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [tab, setTab] = useState<SubTab>("review");
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

      <div className={styles.intro}>
        <h1 className={styles.title}>{t("coach.hubTitle")}</h1>
        <p className={styles.lead}>{t("coach.hubLead")}</p>
      </div>

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
            {selectedCv && (
              <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                📄 {selectedCv.name}
              </div>
            )}
            <button
              type="button"
              className={styles.fileBtn}
              disabled={busyPdf}
              onClick={() => setShowUploadModal(true)}
            >
              ＋ {t("coach.library.add")}
            </button>
          </div>
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

      <CVUploadModal
        open={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={onPdf}
        busy={busyPdf}
        error={pdfError}
      />
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
  const [currentTool, setCurrentTool] = useState<string | undefined>();

  const run = async () => {
    setBusy(true);
    setError(null);
    setCurrentTool(undefined);
    setResults(null);

    try {
      await consumeMatchStream(cv.trim(), {}, {
        onToolCall: (name) => {
          setCurrentTool(name);
        },
        onToolResult: () => {
          // Tool finished, will show next
        },
        onFinal: () => {
          setCurrentTool("final");
        },
      });

      // Fetch final results
      setResults(await matchCv(cv.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      setCurrentTool(undefined);
    }
  };

  return (
    <>
      {!results && (
        <div className={styles.card}>
          <p className={styles.lead}>{t("coach.match.lead")}</p>
          <div className={styles.actionsBar} style={{ marginTop: "1.5rem" }}>
            {error && <span className={styles.error}>⚠ {error}</span>}
            <button className={styles.analyzeBtn} disabled={busy || !ready} onClick={run}>
              🎯 {busy ? t("coach.analyzing") : t("coach.match.cta")}
            </button>
          </div>
        </div>
      )}

      {busy && <AgentWorkflow currentTool={currentTool} />}

      {results && !busy && (
        <MatchResults offers={results} onAdapt={onAdapt} />
      )}

      {!ready && !results && <p className={styles.note}>{t("coach.match.needCv")}</p>}
    </>
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
  return (
    <div className={styles.result}>
      <CVAnalysisResults analysis={a} />
    </div>
  );
}

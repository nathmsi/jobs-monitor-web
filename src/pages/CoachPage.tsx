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

export function CoachPage() {
  const { t, i18n } = useTranslation();
  const { user, signInWithGoogle } = useAuth();
  const { selectedCv, addCv, cvs, selectedId, selectCv } = useCvs();

  const [goal] = useState("");
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

      {/* Page header */}
      <div className={styles.intro}>
        <div className={styles.introRow}>
          <div>
            <h1 className={styles.title}>CV Coach</h1>
            <p className={styles.lead}>Your AI-powered career companion</p>
          </div>
          {user && isReady && (
            <div className={styles.cvChip} onClick={() => setShowUploadModal(true)}>
              <span className={styles.cvDot} />
              <span className={styles.cvName}>{selectedCv?.name ?? "Your CV"}</span>
              <span className={styles.cvChange}>Change</span>
            </div>
          )}
        </div>
      </div>

      {/* Not signed in */}
      {!user && (
        <div className={styles.emptyHero}>
          <div className={styles.emptyHeroIcon}>✦</div>
          <h2 className={styles.emptyHeroTitle}>Unlock your career potential</h2>
          <p className={styles.emptyHeroLead}>
            Sign in to upload your CV and get AI-powered analysis and personalised job matches.
          </p>
          <button className={styles.heroCta} onClick={() => signInWithGoogle()}>
            Sign in with Google
          </button>
        </div>
      )}

      {/* No CV uploaded yet */}
      {user && !isReady && (
        <div className={styles.emptyHero}>
          <div className={styles.emptyHeroIcon}>↑</div>
          <h2 className={styles.emptyHeroTitle}>Start by uploading your CV</h2>
          <p className={styles.emptyHeroLead}>
            Upload a PDF once — then get a detailed AI review and find the jobs that actually fit your profile.
          </p>
          <button className={styles.heroCta} onClick={() => setShowUploadModal(true)}>
            Upload my CV (PDF)
          </button>
          <p className={styles.emptyHeroHint}>PDF only · Max 10 MB · Not stored</p>
        </div>
      )}

      {/* Main content once CV is ready */}
      {user && isReady && (
        <>
          {/* Sub-tabs */}
          <div className={styles.subTabs} role="tablist">
            <button
              role="tab"
              aria-selected={tab === "review"}
              className={`${styles.subTab} ${tab === "review" ? styles.subTabActive : ""}`}
              onClick={() => setTab("review")}
            >
              Improve my CV
            </button>
            <button
              role="tab"
              aria-selected={tab === "match"}
              className={`${styles.subTab} ${tab === "match" ? styles.subTabActive : ""}`}
              onClick={() => setTab("match")}
            >
              Find matching jobs
            </button>
          </div>

          {tab === "review" ? (
            <ReviewTab cv={cvText} goal={goal} ready={isReady} lang={i18n.language} />
          ) : (
            <MatchTab cv={cvText} ready={isReady} onAdapt={() => setTab("review")} />
          )}
        </>
      )}

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

  if (result && !busy) {
    return (
      <div className={styles.result}>
        <div className={styles.resultHeader}>
          <span className={styles.resultLabel}>CV Analysis complete</span>
          <button className={styles.rerunBtn} onClick={() => setResult(null)}>
            Analyze again
          </button>
        </div>
        <CVAnalysisResults analysis={result} />
      </div>
    );
  }

  if (busy) {
    return <LoadingPanel message={steps[stepIdx] ?? ""} />;
  }

  return (
    <div className={styles.launchCard}>
      <div className={styles.launchIcon}>✦</div>
      <h2 className={styles.launchTitle}>Get an honest CV review</h2>
      <p className={styles.launchDesc}>
        Our AI reads your full CV and gives you a structured analysis: your level, target roles, strengths, gaps, and a concrete action plan to get there.
      </p>
      {error && <p className={styles.error}>⚠ {error}</p>}
      <button className={styles.heroCta} disabled={!ready} onClick={run}>
        Analyze my CV
      </button>
      <p className={styles.launchHint}>Takes about 30 seconds · Free</p>
    </div>
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

  if (busy) {
    return <AgentWorkflow currentTool={currentTool} />;
  }

  if (results) {
    return (
      <div className={styles.result}>
        <div className={styles.resultHeader}>
          <span className={styles.resultLabel}>Matched {results.length} jobs for you</span>
          <button className={styles.rerunBtn} onClick={() => setResults(null)}>
            Search again
          </button>
        </div>
        <MatchResults offers={results} onAdapt={onAdapt} />
      </div>
    );
  }

  return (
    <div className={styles.launchCard}>
      <div className={styles.launchIcon}>◈</div>
      <h2 className={styles.launchTitle}>Find jobs that match your profile</h2>
      <p className={styles.launchDesc}>
        Our AI agent reads your CV, searches the job database, and ranks the best opportunities — with a clear explanation of why each one fits you.
      </p>

      {/* How it works */}
      <div className={styles.steps}>
        <div className={styles.step}>
          <span className={styles.stepNum}>1</span>
          <span className={styles.stepText}>Reads your CV</span>
        </div>
        <span className={styles.stepArrow}>→</span>
        <div className={styles.step}>
          <span className={styles.stepNum}>2</span>
          <span className={styles.stepText}>Searches jobs</span>
        </div>
        <span className={styles.stepArrow}>→</span>
        <div className={styles.step}>
          <span className={styles.stepNum}>3</span>
          <span className={styles.stepText}>Ranks matches</span>
        </div>
      </div>

      {error && <p className={styles.error}>⚠ {error}</p>}
      <button className={styles.heroCta} disabled={!ready} onClick={run}>
        Find my best job matches
      </button>
      <p className={styles.launchHint}>Takes about 20 seconds · Powered by AI</p>
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

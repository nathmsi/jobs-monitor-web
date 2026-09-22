import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

import { analyzeCvAi, type CvAnalysis } from "../api/client";
import { Header } from "../components/Header/Header";
import styles from "./CoachPage.module.css";

const sevClass: Record<string, string> = {
  high: styles.sevHigh,
  medium: styles.sevMedium,
  low: styles.sevLow,
};

export function CoachPage() {
  const { t } = useTranslation();
  const [cv, setCv] = useState("");
  const [goal, setGoal] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyPdf, setBusyPdf] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CvAnalysis | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const onPdf = async (file: File) => {
    setBusyPdf(true);
    setError(null);
    try {
      const { extractPdfText } = await import("../lib/pdf");
      setCv(await extractPdfText(file));
    } catch {
      setError(t("coach.pdfError"));
    } finally {
      setBusyPdf(false);
    }
  };

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      setResult(await analyzeCvAi(cv.trim(), goal.trim()));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.app}>
      <Header />

      <Link to="/" className={styles.back}>
        ← {t("profile.back")}
      </Link>

      <div className={styles.intro}>
        <h1 className={styles.title}>{t("coach.title")}</h1>
        <p className={styles.lead}>{t("coach.lead")}</p>
      </div>

      <div className={styles.card}>
        <label className={styles.label}>{t("coach.goalLabel")}</label>
        <input
          className={styles.goal}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder={t("coach.goalPlaceholder")}
        />
        <label className={styles.label}>{t("coach.cvLabel")}</label>
        <div
          className={styles.dropzone}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files?.[0];
            if (f && f.type === "application/pdf") onPdf(f);
          }}
        >
          <textarea
            className={styles.textarea}
            value={cv}
            onChange={(e) => setCv(e.target.value)}
            placeholder={t("coach.cvPlaceholder")}
          />
          <div className={styles.uploadRow}>
            <button
              type="button"
              className={styles.fileBtn}
              disabled={busyPdf}
              onClick={() => fileRef.current?.click()}
            >
              📄 {busyPdf ? t("coach.reading") : t("profile.dropPdf")}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/pdf"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onPdf(f);
              }}
            />
          </div>
        </div>
        <div className={styles.actions}>
          {error && <span className={styles.error}>⚠ {error}</span>}
          <button
            className={styles.analyzeBtn}
            disabled={busy || cv.trim().length < 50}
            onClick={run}
          >
            {busy ? t("coach.analyzing") : t("coach.analyze")}
          </button>
        </div>
        <p className={styles.privacy}>🔒 {t("coach.privacy")}</p>
      </div>

      {result && <Analysis a={result} />}

      <footer className={styles.footer}>{t("footer")}</footer>
    </div>
  );
}

function Analysis({ a }: { a: CvAnalysis }) {
  const { t } = useTranslation();
  return (
    <div className={styles.result}>
      {/* Overall score + snapshot */}
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

      {/* Target */}
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

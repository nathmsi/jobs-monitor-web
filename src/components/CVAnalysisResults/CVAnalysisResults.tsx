import { useTranslation } from "react-i18next";

import type { CvAnalysis } from "../../api/client";
import styles from "./CVAnalysisResults.module.css";
import { splitBeforeAfter } from "./splitBeforeAfter";

type Level = "high" | "medium" | "low";
type Decision = "yes" | "maybe" | "no";

const SCORE_KEYS = ["impact", "clarity", "ats", "technical_depth"] as const;

function tone(value: number): "good" | "mid" | "low" {
  if (value >= 65) return "good";
  if (value >= 40) return "mid";
  return "low";
}

export function CVAnalysisResults({ analysis }: { analysis: CvAnalysis }) {
  const { t } = useTranslation();
  const {
    snapshot,
    target,
    overall,
    first_impression,
    scores,
    strengths,
    red_flags,
    gaps,
    cv_feedback,
    skills_to_learn,
    action_plan,
    keywords_missing,
    source,
  } = analysis;

  const hasNegatives = (red_flags?.length ?? 0) > 0 || (gaps?.length ?? 0) > 0;
  const hasPositives = (strengths?.length ?? 0) > 0;

  return (
    <div className={styles.container}>
      {source === "heuristic" && (
        <p className={styles.notice} role="status">
          {t("coach.analysis.fallback")}
        </p>
      )}

      {/* Hero */}
      <div className={styles.heroSection}>
        <div className={styles.heroCard}>
          <div className={styles.scoreCircle} data-tone={tone(overall?.score ?? 0)}>
            <div className={styles.scoreValue}>{overall?.score ?? "—"}</div>
            <div className={styles.scoreLabel}>{t("coach.analysis.score")}</div>
          </div>

          <div className={styles.heroContent}>
            <h2 className={styles.headline}>{snapshot?.headline}</h2>
            <div className={styles.level}>{snapshot?.current_level}</div>
            <p className={styles.summary}>{overall?.summary}</p>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.years_experience ?? 0}</span>
                <span className={styles.metaLabel}>{t("coach.analysis.years")}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.languages?.length ?? 0}</span>
                <span className={styles.metaLabel}>{t("coach.analysis.languages")}</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.domains?.length ?? 0}</span>
                <span className={styles.metaLabel}>{t("coach.analysis.domains")}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recruiter's verdict */}
      {first_impression && (
        <section className={styles.section} aria-labelledby="cv-verdict">
          <h3 id="cv-verdict" className={styles.sectionTitle}>
            {t("coach.analysis.verdictTitle")}
          </h3>
          <div className={styles.verdictCard}>
            <span
              className={`${styles.decision} ${styles[`decision_${first_impression.interview_decision}`]}`}
            >
              {t(`coach.analysis.decision.${first_impression.interview_decision as Decision}`)}
            </span>
            <p className={styles.scanLabel}>{t("coach.analysis.scan")}</p>
            <blockquote className={styles.scan}>{first_impression.recruiter_scan}</blockquote>
            <p className={styles.verdictReason}>{first_impression.reason}</p>
          </div>
        </section>
      )}

      {/* Score breakdown */}
      {scores && (
        <section className={styles.section} aria-labelledby="cv-scores">
          <h3 id="cv-scores" className={styles.sectionTitle}>
            {t("coach.analysis.scoresTitle")}
          </h3>
          <div className={styles.scoresGrid}>
            {SCORE_KEYS.map((key) => (
              <div key={key} className={styles.scoreRow}>
                <div className={styles.scoreRowHead}>
                  <span>{t(`coach.analysis.scores.${key}`)}</span>
                  <span className={styles.scoreRowValue}>{scores[key]}</span>
                </div>
                <div
                  className={styles.progressBar}
                  role="meter"
                  aria-label={t(`coach.analysis.scores.${key}`)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={scores[key]}
                >
                  <div
                    className={styles.meterFill}
                    data-tone={tone(scores[key])}
                    style={{ width: `${scores[key]}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Target */}
      {target && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("coach.target")}</h3>
          <div className={styles.targetCard}>
            <div className={styles.targetRoles}>
              {(target.roles ?? []).map((role, i) => (
                <div key={i} className={styles.roleTag}>
                  {role}
                </div>
              ))}
            </div>
            <div className={styles.readinessBar}>
              <div className={styles.readinessLabel}>
                <span>{t("coach.analysis.readiness")}</span>
                <span className={styles.readinessPct}>{target.readiness_pct ?? 0}%</span>
              </div>
              <div className={styles.progressBar}>
                <div className={styles.progressFill} style={{ width: `${target.readiness_pct ?? 0}%` }} />
              </div>
            </div>
            {target.assumptions && (
              <p className={styles.targetNote}>
                {t("coach.assumed")}: {target.assumptions}
              </p>
            )}
          </div>
        </section>
      )}

      {/* What works / what hurts */}
      {(hasPositives || hasNegatives) && (
        <div className={styles.twoColumn}>
          {hasPositives && (
            <section className={styles.section}>
              <h3 className={`${styles.sectionTitle} ${styles.titleGood}`}>{t("coach.analysis.worksTitle")}</h3>
              <ul className={styles.listItems}>
                {strengths.map((s, i) => (
                  <li key={i} className={`${styles.listItem} ${styles.itemGood}`}>
                    <span className={styles.itemTitle}>
                      {s.point}
                      {s.impact && (
                        <span className={`${styles.chip} ${styles.chipGood}`}>
                          {t(`coach.analysis.impact.${s.impact as Level}`)}
                        </span>
                      )}
                    </span>
                    <span className={styles.itemEvidence}>{s.evidence}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {hasNegatives && (
            <section className={styles.section}>
              <h3 className={`${styles.sectionTitle} ${styles.titleBad}`}>{t("coach.analysis.hurtsTitle")}</h3>
              <ul className={styles.listItems}>
                {(red_flags ?? []).map((f, i) => (
                  <li key={`rf${i}`} className={`${styles.listItem} ${styles.itemBad}`}>
                    <span className={styles.itemTitle}>{f.flag}</span>
                    <span className={styles.itemEvidence}>{f.why_it_hurts}</span>
                    {f.fix && (
                      <span className={styles.itemFix}>
                        <strong>{t("coach.analysis.fix")}:</strong> {f.fix}
                      </span>
                    )}
                  </li>
                ))}
                {(gaps ?? []).map((g, i) => (
                  <li key={`gap${i}`} className={`${styles.listItem} ${styles.itemBad}`}>
                    <span className={styles.itemTitle}>
                      {g.gap}
                      <span className={`${styles.chip} ${styles[`sev_${g.severity}`]}`}>
                        {t(`coach.analysis.severity.${g.severity as Level}`, { defaultValue: g.severity })}
                      </span>
                    </span>
                    <span className={styles.itemEvidence}>{g.why_it_matters}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}

      {/* CV feedback with before / after */}
      {cv_feedback && cv_feedback.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("coach.cvFeedback")}</h3>
          <div className={styles.feedbackGrid}>
            {cv_feedback.map((f, i) => {
              const rewrite = splitBeforeAfter(f.example ?? "");
              return (
                <div key={i} className={styles.feedbackCard}>
                  <div className={styles.feedbackIssue}>
                    <strong>{t("coach.analysis.issue")}:</strong> {f.issue}
                  </div>
                  <div className={styles.feedbackFix}>
                    <strong>{t("coach.analysis.fix")}:</strong> {f.fix}
                  </div>
                  {rewrite ? (
                    <div className={styles.rewrite}>
                      <p className={styles.rewriteBefore}>
                        <span className={styles.rewriteTag}>{t("coach.analysis.before")}</span>
                        {rewrite.before}
                      </p>
                      <p className={styles.rewriteAfter}>
                        <span className={styles.rewriteTag}>{t("coach.analysis.after")}</span>
                        {rewrite.after}
                      </p>
                    </div>
                  ) : (
                    f.example && (
                      <div className={styles.feedbackExample}>
                        <em>{t("coach.analysis.example")}:</em> {f.example}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Skills to learn */}
      {skills_to_learn && skills_to_learn.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("coach.skills")}</h3>
          <div className={styles.skillsGrid}>
            {skills_to_learn.map((s, i) => (
              <div key={i} className={styles.skillCard}>
                <div className={styles.skillName}>{s.skill}</div>
                <div className={styles.skillReason}>{s.reason}</div>
                <div className={styles.skillHow}>
                  <strong>{t("coach.analysis.how")}:</strong> {s.how}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Action plan */}
      {action_plan && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("coach.plan")}</h3>
          <div className={styles.timelineGrid}>
            {(
              [
                ["d30", action_plan.next_30_days],
                ["d90", action_plan.next_90_days],
                ["m6", action_plan.next_6_months],
              ] as const
            ).map(
              ([key, items]) =>
                items &&
                items.length > 0 && (
                  <div key={key} className={styles.timelineCard}>
                    <div className={styles.timelineHeader}>{t(`coach.${key}`)}</div>
                    <ul className={styles.timelineList}>
                      {items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
          </div>
        </section>
      )}

      {/* Missing ATS keywords */}
      {keywords_missing && keywords_missing.length > 0 && (
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>{t("coach.keywords")}</h3>
          <div className={styles.keywordsList}>
            {keywords_missing.map((kw, i) => (
              <span key={i} className={styles.keyword}>
                {kw}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

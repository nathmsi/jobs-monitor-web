import type { CvAnalysis } from "../../api/client";
import styles from "./CVAnalysisResults.module.css";

export function CVAnalysisResults({ analysis }: { analysis: CvAnalysis }) {
  const { snapshot, target, overall, strengths, gaps, cv_feedback, skills_to_learn, action_plan, keywords_missing } =
    analysis;

  return (
    <div className={styles.container}>
      {/* Hero Section */}
      <div className={styles.heroSection}>
        <div className={styles.heroCard}>
          <div className={styles.scoreCircle}>
            <div className={styles.scoreValue}>{overall?.score ?? "—"}</div>
            <div className={styles.scoreLabel}>Overall Score</div>
          </div>

          <div className={styles.heroContent}>
            <h2 className={styles.headline}>{snapshot?.headline}</h2>
            <div className={styles.level}>{snapshot?.current_level}</div>
            <p className={styles.summary}>{overall?.summary}</p>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.years_experience ?? 0}</span>
                <span className={styles.metaLabel}>Years Experience</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.languages?.length ?? 0}</span>
                <span className={styles.metaLabel}>Languages</span>
              </div>
              <div className={styles.metaItem}>
                <span className={styles.metaValue}>{snapshot?.domains?.length ?? 0}</span>
                <span className={styles.metaLabel}>Domains</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Target Section */}
      {target && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🎯 Your Target Role</h3>
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
                <span>Readiness</span>
                <span className={styles.readinessPct}>{target.readiness_pct ?? 0}%</span>
              </div>
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${target.readiness_pct ?? 0}%` }}
                />
              </div>
            </div>
            {target.assumptions && (
              <p className={styles.targetNote}>ℹ️ {target.assumptions}</p>
            )}
          </div>
        </div>
      )}

      {/* Strengths & Gaps Section */}
      <div className={styles.twoColumn}>
        {/* Strengths */}
        {strengths && strengths.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>✨ Strengths</h3>
            <ul className={styles.listItems}>
              {strengths.map((s, i) => (
                <li key={i} className={styles.listItem}>
                  <span className={styles.itemTitle}>{s.point}</span>
                  <span className={styles.itemEvidence}>{s.evidence}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Gaps */}
        {gaps && gaps.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>⚠️ Gaps to Close</h3>
            <ul className={styles.listItems}>
              {gaps.map((g, i) => (
                <li key={i} className={`${styles.listItem} ${styles[`sev${g.severity?.charAt(0)?.toUpperCase() || "M"}`]}`}>
                  <span className={styles.itemTitle}>{g.gap}</span>
                  <span className={styles.itemEvidence}>{g.why_it_matters}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Skills to Learn */}
      {skills_to_learn && skills_to_learn.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🚀 Skills to Learn</h3>
          <div className={styles.skillsGrid}>
            {skills_to_learn.map((s, i) => (
              <div key={i} className={styles.skillCard}>
                <div className={styles.skillName}>{s.skill}</div>
                <div className={styles.skillReason}>{s.reason}</div>
                <div className={styles.skillHow}>
                  <strong>How:</strong> {s.how}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CV Feedback */}
      {cv_feedback && cv_feedback.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📝 CV Writing Tips</h3>
          <div className={styles.feedbackGrid}>
            {cv_feedback.map((f, i) => (
              <div key={i} className={styles.feedbackCard}>
                <div className={styles.feedbackIssue}>
                  <strong>Issue:</strong> {f.issue}
                </div>
                <div className={styles.feedbackFix}>
                  <strong>Fix:</strong> {f.fix}
                </div>
                <div className={styles.feedbackExample}>
                  <em>Example:</em> {f.example}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Plan */}
      {action_plan && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>📋 Action Plan</h3>
          <div className={styles.timelineGrid}>
            {action_plan.next_30_days && action_plan.next_30_days.length > 0 && (
              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>Next 30 Days</div>
                <ul className={styles.timelineList}>
                  {action_plan.next_30_days.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {action_plan.next_90_days && action_plan.next_90_days.length > 0 && (
              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>Next 90 Days</div>
                <ul className={styles.timelineList}>
                  {action_plan.next_90_days.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
            {action_plan.next_6_months && action_plan.next_6_months.length > 0 && (
              <div className={styles.timelineCard}>
                <div className={styles.timelineHeader}>Next 6 Months</div>
                <ul className={styles.timelineList}>
                  {action_plan.next_6_months.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Missing Keywords */}
      {keywords_missing && keywords_missing.length > 0 && (
        <div className={styles.section}>
          <h3 className={styles.sectionTitle}>🔑 ATS Keywords to Add</h3>
          <div className={styles.keywordsList}>
            {keywords_missing.map((kw, i) => (
              <span key={i} className={styles.keyword}>
                {kw}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

import { useTranslation } from "react-i18next";

import type { MatchStep } from "../../hooks/useMatchRun";
import { AlertCircleIcon, CheckIcon, SparkleIcon } from "../Icons/Icons";
import styles from "./AgentWorkflow.module.css";
import { currentPhase, describeStep, PHASES } from "./agentPhases";

function seconds(ms: number): string {
  return (ms / 1000).toFixed(1);
}

/**
 * Live progress of a match: the four stages, and every search the agent runs.
 * One status message is announced to screen readers (not every step), per the
 * "single atomic status" rule; the list below is plain content.
 */
export function AgentWorkflow({ steps }: { steps: readonly MatchStep[] }) {
  const { t } = useTranslation();
  const phase = currentPhase(steps);
  const phaseIndex = PHASES.indexOf(phase);

  return (
    <section className={styles.container} aria-busy="true" aria-labelledby="agentTitle">
      <header className={styles.header}>
        <span className={styles.badge}>
          <SparkleIcon size={18} />
          <h3 id="agentTitle" className={styles.badgeText}>{t("agent.title")}</h3>
        </span>
        <p className={styles.subtitle}>{t("agent.subtitle")}</p>
      </header>

      <p className={styles.srOnly} role="status" aria-atomic="true">
        {t("match.progress.status", {
          n: phaseIndex + 1,
          total: PHASES.length,
          phase: t(`match.progress.phase.${phase}`),
        })}
      </p>

      <ol className={styles.phases} aria-label={t("match.progress.aria")}>
        {PHASES.map((p, i) => {
          const state = i < phaseIndex ? "done" : i === phaseIndex ? "active" : "todo";
          return (
            <li
              key={p}
              className={`${styles.phase} ${styles[state]}`}
              aria-current={state === "active" ? "step" : undefined}
            >
              <span className={styles.phaseMark} aria-hidden="true">
                {state === "done" ? <CheckIcon size={16} strokeWidth={2.5} /> : state === "active" ? <span className={styles.spinner} /> : i + 1}
              </span>
              <span className={styles.phaseText}>
                <span className={styles.phaseName}>{t(`match.progress.phase.${p}`)}</span>
                <span className={styles.phaseDesc}>{t(`match.progress.desc.${p}`)}</span>
              </span>
            </li>
          );
        })}
      </ol>

      {steps.length > 0 ? (
        <ul className={styles.steps} aria-label={t("match.progress.stepsAria")}>
          {steps.map((s) => {
            const { key, values } = describeStep(s);
            return (
              <li key={s.id} className={`${styles.step} ${styles[`step_${s.status}`]}`}>
                <span className={styles.stepIcon} aria-hidden="true">
                  {s.status === "done" ? (
                    <CheckIcon size={16} strokeWidth={2.5} />
                  ) : s.status === "failed" ? (
                    <AlertCircleIcon size={16} />
                  ) : (
                    <span className={styles.spinnerSm} />
                  )}
                </span>
                <span className={styles.stepLabel}>{t(`match.step.${key}`, values)}</span>
                {s.duration !== undefined ? (
                  <span className={styles.stepTime}>{t("match.progress.seconds", { s: seconds(s.duration) })}</span>
                ) : null}
                {s.status === "failed" ? <span className={styles.stepFailed}>{t("match.progress.failed")}</span> : null}
              </li>
            );
          })}
        </ul>
      ) : null}

      <p className={styles.hint}>{t("match.progress.wait")}</p>
    </section>
  );
}

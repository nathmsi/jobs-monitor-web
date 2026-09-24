import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import styles from "./AgentWorkflow.module.css";

export interface ToolStep {
  tool: string;
  icon: string;
  label: string;
  status: "pending" | "running" | "done" | "cached";
  duration?: number;
}

export function AgentWorkflow({
  currentTool,
  steps = [],
  message,
}: {
  currentTool?: string;
  steps?: ToolStep[];
  message?: string;
}) {
  const { t } = useTranslation();
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowPulse((p) => !p), 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.agentBadge}>
          <span className={styles.agentIcon}>🤖</span>
          <span className={styles.agentText}>{t("agent.title")}</span>
        </div>
        <p className={styles.subtitle}>{t("agent.subtitle")}</p>
      </div>

      <div className={styles.workflow}>
        <div className={`${styles.phase} ${currentTool?.startsWith("search") ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>🔍</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>{t("agent.search")}</div>
            <div className={styles.phaseDesc}>{t("agent.searchDesc")}</div>
          </div>
          {currentTool?.startsWith("search") && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>

        <div className={styles.arrow}>→</div>

        <div className={`${styles.phase} ${currentTool?.startsWith("read") ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>📖</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>{t("agent.read")}</div>
            <div className={styles.phaseDesc}>{t("agent.readDesc")}</div>
          </div>
          {currentTool?.startsWith("read") && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>

        <div className={styles.arrow}>→</div>

        <div className={`${styles.phase} ${currentTool === "final" ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>🏆</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>{t("agent.rank")}</div>
            <div className={styles.phaseDesc}>{t("agent.rankDesc")}</div>
          </div>
          {currentTool === "final" && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>
      </div>

      {message && (
        <div className={styles.activityBox}>
          <div className={styles.activitySpinner} />
          <div className={styles.activityText}>{message}</div>
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className={styles.toolsGrid}>
          {steps.map((step) => (
            <div key={step.tool} className={`${styles.toolCard} ${styles[step.status]}`}>
              <div className={styles.toolEmoji}>
                {{ search_offers: "🔍", read_offer: "📖", market_stats: "📊", search_and_read_top: "⚡" }[step.tool] ?? "⚙️"}
              </div>
              <div className={styles.toolName}>{step.label}</div>
              {step.status === "done" && step.duration && (
                <div className={styles.toolDuration}>{step.duration}ms</div>
              )}
              {step.status === "cached" && <div className={styles.toolCached}>⚡ {t("agent.cached")}</div>}
              <div className={styles.toolStatus}>
                {step.status === "pending" && "⏳"}
                {step.status === "running" && "⚡"}
                {step.status === "done" && "✓"}
                {step.status === "cached" && "⚡"}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

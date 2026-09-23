import { useEffect, useState } from "react";
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
  const [showPulse, setShowPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setShowPulse((p) => !p), 600);
    return () => clearInterval(interval);
  }, []);

  const toolIcons: Record<string, { emoji: string; label: string }> = {
    search_offers: { emoji: "🔍", label: "Job Scout" },
    read_offer: { emoji: "📖", label: "Deep Reader" },
    market_stats: { emoji: "📊", label: "Market Analyzer" },
    search_and_read_top: { emoji: "⚡", label: "Smart Collector" },
  };

  return (
    <div className={styles.container}>
      {/* Agent Header */}
      <div className={styles.header}>
        <div className={styles.agentBadge}>
          <span className={styles.agentIcon}>🤖</span>
          <span className={styles.agentText}>AI Matching Agent</span>
        </div>
        <p className={styles.subtitle}>Intelligently searching for your perfect role</p>
      </div>

      {/* Workflow Diagram */}
      <div className={styles.workflow}>
        {/* Search Phase */}
        <div className={`${styles.phase} ${currentTool?.startsWith("search") ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>🔍</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>Search</div>
            <div className={styles.phaseDesc}>Finding candidates</div>
          </div>
          {currentTool?.startsWith("search") && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>

        {/* Arrow */}
        <div className={styles.arrow}>→</div>

        {/* Read Phase */}
        <div className={`${styles.phase} ${currentTool?.startsWith("read") ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>📖</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>Read</div>
            <div className={styles.phaseDesc}>Deep dive details</div>
          </div>
          {currentTool?.startsWith("read") && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>

        {/* Arrow */}
        <div className={styles.arrow}>→</div>

        {/* Rank Phase */}
        <div className={`${styles.phase} ${currentTool === "final" ? styles.active : ""}`}>
          <div className={styles.phaseIcon}>🏆</div>
          <div className={styles.phaseLabel}>
            <div className={styles.phaseName}>Rank</div>
            <div className={styles.phaseDesc}>Best matches</div>
          </div>
          {currentTool === "final" && <div className={`${styles.pulse} ${showPulse ? styles.pulseActive : ""}`} />}
        </div>
      </div>

      {/* Current Activity */}
      {message && (
        <div className={styles.activityBox}>
          <div className={styles.activitySpinner} />
          <div className={styles.activityText}>{message}</div>
        </div>
      )}

      {/* Tool Details */}
      {steps && steps.length > 0 && (
        <div className={styles.toolsGrid}>
          {steps.map((step) => (
            <div key={step.tool} className={`${styles.toolCard} ${styles[step.status]}`}>
              <div className={styles.toolEmoji}>{toolIcons[step.tool]?.emoji || "⚙️"}</div>
              <div className={styles.toolName}>{toolIcons[step.tool]?.label || step.label}</div>
              {step.status === "done" && step.duration && (
                <div className={styles.toolDuration}>{step.duration}ms</div>
              )}
              {step.status === "cached" && <div className={styles.toolCached}>⚡ Cached</div>}
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

import type { MatchStep } from "../../hooks/useMatchRun";

/** The stages a match goes through, in order. */
export const PHASES = ["profile", "search", "compare", "rank"] as const;
export type Phase = (typeof PHASES)[number];

type StepKind = "search" | "read" | "stats" | "other";

function kindOf(name: string): StepKind {
  if (name === "search_offers" || name === "search_and_read_top") return "search";
  if (name === "read_offer") return "read";
  if (name === "market_stats") return "stats";
  return "other";
}

/**
 * Where the match is, from the steps seen so far. It only moves forward:
 *  - no step yet: the CV is being read;
 *  - a search is running: searching;
 *  - nothing running, nothing read yet: the agent is weighing what it found;
 *  - an offer was read / ranked: writing the final ranking.
 */
export function currentPhase(steps: readonly MatchStep[]): Phase {
  if (steps.length === 0) return "profile";

  let searching = false;
  let reading = false;
  let hasRead = false;
  for (const s of steps) {
    const kind = kindOf(s.name);
    if (kind === "read") hasRead = true;
    if (s.status !== "running") continue;
    if (kind === "read") reading = true;
    else searching = true;
  }

  if (searching) return "search";
  if (reading) return "compare";
  return hasRead ? "rank" : "compare";
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

/** What the agent was asked to look for, as a short readable string. */
function searchTarget(input: unknown): string {
  if (!isRecord(input)) return "";
  const role = typeof input.role === "string" ? input.role : "";
  const skills = Array.isArray(input.skills)
    ? input.skills.filter((s): s is string => typeof s === "string").slice(0, 3).join(", ")
    : "";
  return [role, skills].filter(Boolean).join(" · ");
}

export interface StepLabel {
  /** i18n key under `match.step`. */
  key: string;
  values: Record<string, string | number>;
}

/** The sentence describing one step, as an i18n key plus its values. */
export function describeStep(step: Pick<MatchStep, "name" | "input">): StepLabel {
  const input = isRecord(step.input) ? step.input : {};

  switch (step.name) {
    case "search_offers":
    case "search_and_read_top": {
      // The no-agent pipeline reports how many skills it scored with, not what it searched.
      if (typeof input.skills === "number") return { key: "scoring", values: { count: input.skills } };
      const what = searchTarget(step.input);
      const base = step.name === "search_and_read_top" ? "searchRead" : "search";
      return what ? { key: base, values: { what } } : { key: `${base}Any`, values: {} };
    }
    case "read_offer":
      return typeof input.offers === "number"
        ? { key: "ranking", values: { count: input.offers } }
        : { key: "read", values: {} };
    case "market_stats":
      return { key: "stats", values: { what: typeof input.role === "string" ? input.role : "" } };
    default:
      return { key: "other", values: { name: step.name } };
  }
}

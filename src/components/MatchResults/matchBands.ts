export type ScoreBand = "strong" | "good" | "stretch";

export const BANDS: readonly ScoreBand[] = ["strong", "good", "stretch"];

/** Honest reading of a match score: 75+ apply today, 55-74 good with gaps, below is a stretch. */
export function scoreBand(score: number): ScoreBand {
  if (score >= 75) return "strong";
  if (score >= 55) return "good";
  return "stretch";
}

import type { RegionInfo } from "../types";

/** Region name in the active UI language (falls back to English). */
export function regionLabel(region: RegionInfo, lang: string): string {
  if (lang.startsWith("he")) return region.label_he;
  if (lang.startsWith("fr")) return region.label_fr ?? region.label_en;
  return region.label_en;
}

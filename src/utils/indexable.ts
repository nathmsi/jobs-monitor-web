/** An offer needs this much text to be worth a search-engine result. */
export const MIN_INDEXABLE_TEXT = 200;

/** The text shown as an offer's description: the full one, else the short extract. */
export function offerText(job: { description?: string; excerpt?: string }): string {
  return (job.description || job.excerpt || "").trim();
}

/** Live, with enough text: the only offers that get indexed and listed in the sitemap. */
export function isIndexableJob(job: { description?: string; excerpt?: string; is_expired?: boolean }): boolean {
  return !job.is_expired && offerText(job).length >= MIN_INDEXABLE_TEXT;
}

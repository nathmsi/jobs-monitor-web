/** Stable per-offer id. */
export function jobId(source: string, externalId: string): string {
  return `${source}-${externalId}`;
}

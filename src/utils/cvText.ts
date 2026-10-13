/** The API refuses a CV shorter than this, so a shorter one is as good as empty. */
export const MIN_CV_CHARS = 50;

/** True when a CV has enough text to analyse. A scanned or image-only PDF yields none. */
export function isReadableCv(text: string | null | undefined): boolean {
  return (text ?? "").trim().length >= MIN_CV_CHARS;
}

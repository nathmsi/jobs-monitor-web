/** Message of any thrown value (Error or otherwise). */
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

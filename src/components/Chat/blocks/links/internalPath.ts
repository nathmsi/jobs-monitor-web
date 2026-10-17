/**
 * Only addresses inside the site are followed. The API already builds them from a fixed list of
 * pages; this is the second lock, so a link can never leave the site whatever the answer holds.
 */
export function isInternalPath(path: string): boolean {
  return path.startsWith("/") && !path.startsWith("//") && !path.includes("\\") && !/^\/[a-z][a-z0-9+.-]*:/i.test(path);
}

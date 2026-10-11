export interface HighlightParts {
  before: string;
  match: string;
  after: string;
}

/**
 * Splits `label` around the first place the typed text appears (case
 * insensitive), so the match can be emphasised. No match → the whole label is
 * `before`.
 */
export function highlightParts(label: string, typed: string): HighlightParts {
  const needle = typed.trim().toLowerCase();
  const at = needle ? label.toLowerCase().indexOf(needle) : -1;
  if (at < 0) return { before: label, match: "", after: "" };
  return {
    before: label.slice(0, at),
    match: label.slice(at, at + needle.length),
    after: label.slice(at + needle.length),
  };
}

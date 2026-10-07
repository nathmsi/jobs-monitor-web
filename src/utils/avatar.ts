// Deterministic avatar color + initials for a source, so each box gets a
// stable, distinct look.
const PALETTE = [
  "#2f6bff", "#0a7d43", "#c2410c", "#7c3aed", "#0891b2",
  "#be185d", "#b45309", "#4f46e5", "#0f766e", "#9333ea", "#0369a1",
];

export function avatarColor(key: string): string {
  let h = 0;
  for (const ch of key) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PALETTE[h % PALETTE.length];
}

export function initials(label: string): string {
  const words = label
    .replace(/[^A-Za-z0-9֐-׿ ]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  const first = words[0]?.[0] ?? label[0] ?? "?";
  const second = words[1]?.[0] ?? "";
  return (first + second).toUpperCase();
}

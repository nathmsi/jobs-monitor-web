export type DescriptionBlock =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string };

/** Section titles that offers commonly run into their text without a line break. */
const HEADINGS = [
  "About the Role",
  "About the Team",
  "About the Job",
  "About the Company",
  "About Us",
  "Who We Are",
  "Who You Are",
  "The Role",
  "The Team",
  "Your Role",
  "Job Description",
  "What You'll Do",
  "What You Will Do",
  "What You'll Be Doing",
  "Key Responsibilities",
  "Responsibilities",
  "Requirements",
  "Basic Qualifications",
  "Preferred Qualifications",
  "Qualifications",
  "What We're Looking For",
  "What You Bring",
  "What You'll Need",
  "Nice to Have",
  "Bonus Points",
  "Benefits",
  "What We Offer",
  "Why Join Us",
];

/** A title at the start of the text or right after a sentence, followed by a capital letter or a bracket. */
const HEADING_RE = new RegExp(`(?:^|(?<=[.!?:]\\s))(${HEADINGS.join("|").replace(/'/g, "['’]")}):?(?=\\s+[A-Z(])`, "g");

/** The offers' text is cut at this many characters when it is stored. */
export const STORED_TEXT_LIMIT = 1200;

/** True when the stored description was cut short (the full text is on the company's site). */
export function isShortened(text: string): boolean {
  return text.trim().length >= STORED_TEXT_LIMIT - 10;
}

const MAX_SENTENCES = 3;
const MAX_PARAGRAPH = 360;

function paragraphsOf(text: string): string[] {
  const sentences = text
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(]|\P{ASCII})/u)
    .map((s) => s.trim())
    .filter(Boolean);
  const out: string[] = [];
  let current: string[] = [];
  let length = 0;
  for (const sentence of sentences) {
    if (current.length >= MAX_SENTENCES || (current.length > 0 && length + sentence.length > MAX_PARAGRAPH)) {
      out.push(current.join(" "));
      current = [];
      length = 0;
    }
    current.push(sentence);
    length += sentence.length + 1;
  }
  if (current.length) out.push(current.join(" "));
  return out;
}

/**
 * Turns the offers' one-line text into something readable: known section
 * titles become headings, and the rest is cut into short paragraphs. Text that
 * already has line breaks keeps them as paragraph breaks.
 */
export function descriptionBlocks(raw: string): DescriptionBlock[] {
  const text = raw.replace(/[ \t]+/g, " ").trim();
  if (!text) return [];

  const blocks: DescriptionBlock[] = [];
  const addText = (chunk: string) => {
    for (const line of chunk.split(/\n+/)) {
      for (const p of paragraphsOf(line)) blocks.push({ type: "paragraph", text: p });
    }
  };

  let last = 0;
  for (const match of text.matchAll(HEADING_RE)) {
    const at = match.index ?? 0;
    if (at > last) addText(text.slice(last, at));
    blocks.push({ type: "heading", text: match[1] });
    last = at + match[0].length;
  }
  addText(text.slice(last));
  return blocks;
}

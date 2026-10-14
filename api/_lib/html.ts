export interface PageMeta {
  title: string;
  description: string;
  /** Absolute URL of the page. */
  canonical: string;
  /** e.g. "noindex,follow". */
  robots?: string;
  /** Structured data blocks (JSON-LD). */
  jsonLd?: object[];
}

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Text with line breaks → one escaped <p> per line. */
export function paragraphs(text: string): string {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join("");
}

/** JSON that is safe inside a <script> block. */
export function jsonForScript(data: object): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

function replaceTag(html: string, pattern: RegExp, tag: string): string {
  return pattern.test(html) ? html.replace(pattern, tag) : html.replace("</head>", `    ${tag}\n  </head>`);
}

/**
 * Puts a page's own title, description, canonical, social tags, structured data
 * and readable content into the app's `index.html`. The app then takes over in
 * the browser; search engines read the finished HTML.
 */
export function injectIntoShell(shell: string, meta: PageMeta, body: string): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const canonical = escapeHtml(meta.canonical);

  let html = shell;
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${title}</title>`);
  html = replaceTag(html, /<meta\s+name="description"[\s\S]*?\/>/, `<meta name="description" content="${description}" />`);
  html = replaceTag(html, /<link\s+rel="canonical"[\s\S]*?\/>/, `<link rel="canonical" href="${canonical}" />`);
  html = replaceTag(html, /<meta\s+property="og:title"[\s\S]*?\/>/, `<meta property="og:title" content="${title}" />`);
  html = replaceTag(html, /<meta\s+property="og:description"[\s\S]*?\/>/, `<meta property="og:description" content="${description}" />`);
  html = replaceTag(html, /<meta\s+property="og:url"[\s\S]*?\/>/, `<meta property="og:url" content="${canonical}" />`);
  html = replaceTag(html, /<meta\s+name="twitter:title"[\s\S]*?\/>/, `<meta name="twitter:title" content="${title}" />`);
  html = replaceTag(html, /<meta\s+name="twitter:description"[\s\S]*?\/>/, `<meta name="twitter:description" content="${description}" />`);

  const extra: string[] = [];
  if (meta.robots) extra.push(`<meta name="robots" content="${escapeHtml(meta.robots)}" />`);
  for (const block of meta.jsonLd ?? []) {
    extra.push(`<script type="application/ld+json">${jsonForScript(block)}</script>`);
  }
  if (extra.length) html = html.replace("</head>", `    ${extra.join("\n    ")}\n  </head>`);

  return html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
}

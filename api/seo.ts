import { createHandler, type Req, type Res } from "./_lib/handler.js";

const SITE_URL = (process.env.SITE_URL ?? "https://jobs-monitor-web.vercel.app").replace(/\/+$/, "");
const API_URL = process.env.API_URL ?? process.env.VITE_API_URL ?? "http://localhost:8080";

let shell: { at: number; html: string } | null = null;
const SHELL_TTL_MS = 5 * 60_000;

/** The app's index.html, as deployed next to this function. */
async function getShell(origin: string): Promise<string> {
  if (shell && Date.now() - shell.at < SHELL_TTL_MS) return shell.html;
  const resp = await fetch(`${origin}/index.html`);
  if (!resp.ok) throw new Error(`index.html: HTTP ${resp.status}`);
  const html = await resp.text();
  shell = { at: Date.now(), html };
  return html;
}

interface VercelReq extends Req {
  headers: Record<string, string | string[] | undefined>;
}

/** Vercel function: HTML with the page's own content, tags and structured data for crawlers. */
export default async function handler(req: VercelReq, res: Res): Promise<void> {
  const host = String(req.headers["x-forwarded-host"] ?? req.headers.host ?? "");
  const proto = String(req.headers["x-forwarded-proto"] ?? "https");
  const origin = host ? `${proto}://${host}` : SITE_URL;
  await createHandler({ apiBase: API_URL, siteUrl: SITE_URL, getShell: () => getShell(origin) })(req, res);
}
